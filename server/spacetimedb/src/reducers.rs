use crate::physics::{calculate_kinematics, TICK_RATE_MS};
use crate::tables::{physics_timer, player, ship, PhysicsTimer, Player, Ship, Waypoint};
use spacetimedb::{reducer, ReducerContext, ScheduleAt, Table};

#[reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    ctx.db.physics_timer().insert(PhysicsTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Time(
            ctx.timestamp + std::time::Duration::from_millis(TICK_RATE_MS),
        ),
    });
    Ok(())
}

#[reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    if let Some(player) = ctx.db.player().identity().find(ctx.sender()) {
        ctx.db.player().identity().update(Player {
            online: true,
            ..player
        });
    }
}

#[reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) {
    if let Some(player) = ctx.db.player().identity().find(ctx.sender()) {
        ctx.db.player().identity().update(Player {
            online: false,
            ..player
        });
    }
}

#[reducer]
pub fn register_player(ctx: &ReducerContext, name: String) -> Result<(), String> {
    if name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }

    if ctx.db.player().identity().find(ctx.sender()).is_some() {
        return Err("Player already registered".to_string());
    }

    ctx.db.player().insert(Player {
        identity: ctx.sender(),
        name,
        online: true,
    });
    Ok(())
}

#[reducer]
pub fn spawn_ship(ctx: &ReducerContext, x: f32, y: f32) -> Result<(), String> {
    if ctx.db.player().identity().find(ctx.sender()).is_none() {
        return Err("Player not registered".to_string());
    }

    ctx.db.ship().insert(Ship {
        id: 0,
        owner: ctx.sender(),
        x,
        y,
        heading: 0.0,
        speed: 0.0,
        waypoint: None,
    });
    Ok(())
}

#[reducer]
pub fn set_waypoint(
    ctx: &ReducerContext,
    ship_id: u64,
    target_x: f32,
    target_y: f32,
    target_speed: f32,
) -> Result<(), String> {
    let ship = ctx.db.ship().id().find(ship_id).ok_or("Ship not found")?;

    if ship.owner != ctx.sender() {
        return Err("Not your ship".to_string());
    }

    ctx.db.ship().id().update(Ship {
        waypoint: Some(Waypoint {
            x: target_x,
            y: target_y,
            target_speed,
        }),
        ..ship
    });

    Ok(())
}

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

    Ok(())
}
