use crate::physics::MISSILE_SPEED_MULTIPLIER;
use crate::tables::{missile, player, ship, Missile, Ship};
use crate::types::{ShipClass, Waypoint};
use spacetimedb::{reducer, ReducerContext, Table};

#[reducer]
pub fn spawn_ship(ctx: &ReducerContext, ship_class: ShipClass, x: f32, y: f32) -> Result<(), String> {
    if ctx.db.player().identity().find(ctx.sender()).is_none() {
        return Err("Player not registered".to_string());
    }

    ctx.db.ship().insert(Ship {
        id: 0,
        owner_id: ctx.sender(),
        ship_class,
        x,
        y,
        heading: 0.0,
        speed: 0.0,
        radar_on: true,
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

    if ship.owner_id != ctx.sender() {
        return Err("Not your ship".to_string());
    }

    // Cap target speed by ship class
    let max_speed = ship.ship_class.max_speed();
    let final_target_speed = target_speed.min(max_speed);

    ctx.db.ship().id().update(Ship {
        waypoint: Some(Waypoint {
            x: target_x,
            y: target_y,
            target_speed: final_target_speed,
        }),
        ..ship
    });

    Ok(())
}

#[reducer]
pub fn toggle_radar(ctx: &ReducerContext, ship_id: u64) -> Result<(), String> {
    let ship = ctx.db.ship().id().find(ship_id).ok_or("Ship not found")?;

    if ship.owner_id != ctx.sender() {
        return Err("Not your ship".to_string());
    }

    ctx.db.ship().id().update(Ship {
        radar_on: !ship.radar_on,
        ..ship
    });

    Ok(())
}

#[reducer]
pub fn fire_missile(
    ctx: &ReducerContext,
    ship_id: u64,
    target_x: f32,
    target_y: f32,
    target_ship_id: Option<u64>,
) -> Result<(), String> {
    let ship = ctx.db.ship().id().find(ship_id).ok_or("Ship not found")?;

    if ship.owner_id != ctx.sender() {
        return Err("Not your ship".to_string());
    }

    let missile_speed = ship.speed.max(5.0) * MISSILE_SPEED_MULTIPLIER;

    ctx.db.missile().insert(Missile {
        id: 0,
        owner_id: ctx.sender(),
        x: ship.x,
        y: ship.y,
        heading: ship.heading,
        speed: missile_speed,
        target_x,
        target_y,
        target_ship_id,
    });

    Ok(())
}
