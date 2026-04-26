use crate::physics::{
    calculate_kinematics, point_to_segment_distance, ARRIVAL_DISTANCE, CIWS_RANGE, TICK_RATE_MS,
};
use crate::tables::{missile, physics_timer, ship, Missile, PhysicsTimer, Ship};
use rand::{Rng, RngCore};
use spacetimedb::{reducer, ReducerContext, ScheduleAt, Table};

#[reducer]
pub fn physics_tick(ctx: &ReducerContext, _timer: PhysicsTimer) -> Result<(), String> {
    // Schedule next tick
    ctx.db.physics_timer().insert(PhysicsTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Time(
            ctx.timestamp + std::time::Duration::from_millis(TICK_RATE_MS),
        ),
    });

    let dt = TICK_RATE_MS as f32 / 1000.0;

    for ship in ctx.db.ship().iter() {
        let (new_x, new_y, new_heading, new_speed, new_waypoint) = calculate_kinematics(
            ship.x,
            ship.y,
            ship.heading,
            ship.speed,
            ship.waypoint.clone(),
            dt,
        );

        ctx.db.ship().id().update(Ship {
            x: new_x,
            y: new_y,
            heading: new_heading,
            speed: new_speed,
            waypoint: new_waypoint,
            ..ship
        });
    }

    // Missile Logic
    let mut missiles_to_delete = Vec::new();
    let mut ships_to_delete = Vec::new();

    for missile in ctx.db.missile().iter() {
        let mut target_x = missile.target_x;
        let mut target_y = missile.target_y;

        // If it's a guided missile, update its target coordinates to the ship's current position
        if let Some(target_ship_id) = missile.target_ship_id {
            if let Some(target_ship) = ctx.db.ship().id().find(target_ship_id) {
                target_x = target_ship.x;
                target_y = target_ship.y;
            }
        }

        let dx = target_x - missile.x;
        let dy = target_y - missile.y;

        // 1. Calculate new position before checking impact
        let heading = dy.atan2(dx);
        let new_x = missile.x + missile.speed * heading.cos() * dt;
        let new_y = missile.y + missile.speed * heading.sin() * dt;

        // 2. Check for DCA (Distance of Closest Approach) on the trajectory segment
        // This prevents missiles from "tunneling" through targets at high speed
        let dca_distance =
            point_to_segment_distance(target_x, target_y, missile.x, missile.y, new_x, new_y);

        let mut intercepted = false;
        if dca_distance <= ARRIVAL_DISTANCE {
            // Missile path passes within arrival distance of target
            missiles_to_delete.push(missile.id);
            if let Some(target_ship_id) = missile.target_ship_id {
                ships_to_delete.push(target_ship_id);
            }
            continue;
        }

        // 3. Check for CIWS intercepts - limit to ONE ship attempt per missile per tick
        // Collect all ships in CIWS range (except missile owner)
        let mut ships_in_range = Vec::new();
        for ship in ctx.db.ship().iter() {
            if ship.owner_id != missile.owner_id {
                let sdx = ship.x - missile.x;
                let sdy = ship.y - missile.y;
                let s_dist = (sdx * sdx + sdy * sdy).sqrt();

                if s_dist <= CIWS_RANGE {
                    ships_in_range.push(ship.id);
                }
            }
        }

        // Randomly select ONE ship from those in range and let it attempt interception
        if !ships_in_range.is_empty() {
            let selected_ship_idx = (ctx.rng().next_u32() as usize) % ships_in_range.len();
            let selected_ship_id = ships_in_range[selected_ship_idx];

            if let Some(selected_ship) = ctx.db.ship().id().find(selected_ship_id) {
                let prob = selected_ship.ship_class.ciws_probability();
                if ctx.rng().gen_bool(prob as f64) {
                    intercepted = true;
                }
            }
        }

        if intercepted {
            missiles_to_delete.push(missile.id);
            continue;
        }

        // 4. Update missile position
        ctx.db.missile().id().update(Missile {
            x: new_x,
            y: new_y,
            heading,
            target_x,
            target_y,
            ..missile
        });
    }

    for id in missiles_to_delete {
        ctx.db.missile().id().delete(id);
    }

    for id in ships_to_delete {
        ctx.db.ship().id().delete(id);
    }

    Ok(())
}
