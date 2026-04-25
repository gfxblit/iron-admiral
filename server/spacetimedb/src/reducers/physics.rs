use crate::physics::{calculate_kinematics, ARRIVAL_DISTANCE, CIWS_RANGE, TICK_RATE_MS};
use crate::tables::{missile, physics_timer, ship, Missile, PhysicsTimer, Ship};
use rand::Rng;
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
        let distance = (dx * dx + dy * dy).sqrt();

        // 1. Check for CIWS Intercepts from ANY nearby ship (not just the target)
        let mut intercepted = false;
        for ship in ctx.db.ship().iter() {
            // Only your own or allied ships would intercept? 
            // Actually, in a simulation, any ship might try to defend itself or its fleet.
            // For now, let's say ANY ship within CIWS range that is NOT the owner of the missile tries to intercept.
            if ship.owner_id != missile.owner_id {
                let sdx = ship.x - missile.x;
                let sdy = ship.y - missile.y;
                let s_dist = (sdx * sdx + sdy * sdy).sqrt();

                if s_dist <= CIWS_RANGE {
                    let prob = ship.ship_class.ciws_probability();
                    if ctx.rng().gen_bool(prob as f64) {
                        intercepted = true;
                        break;
                    }
                }
            }
        }

        if intercepted {
            missiles_to_delete.push(missile.id);
            continue;
        }

        // 2. Check for Impact
        if distance <= ARRIVAL_DISTANCE {
            missiles_to_delete.push(missile.id);
            // If it was targeting a ship, that ship is destroyed
            if let Some(target_ship_id) = missile.target_ship_id {
                ships_to_delete.push(target_ship_id);
            }
            continue;
        }

        // 3. Move towards target
        let heading = dy.atan2(dx);
        let new_x = missile.x + missile.speed * heading.cos() * dt;
        let new_y = missile.y + missile.speed * heading.sin() * dt;

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
