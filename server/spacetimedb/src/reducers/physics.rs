use crate::physics::{calculate_kinematics, TICK_RATE_MS};
use crate::tables::{physics_timer, ship, PhysicsTimer, Ship};
use spacetimedb::{reducer, ReducerContext, ScheduleAt, Table};

#[reducer]
pub fn physics_tick(ctx: &ReducerContext, timer: PhysicsTimer) -> Result<(), String> {
    // Delete the timer that triggered this tick
    ctx.db
        .physics_timer()
        .scheduled_id()
        .delete(timer.scheduled_id);

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

    Ok(())
}
