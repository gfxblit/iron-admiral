use crate::tables::{player, ship, Ship};
use crate::types::Waypoint;
use spacetimedb::{reducer, ReducerContext, Table};

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
