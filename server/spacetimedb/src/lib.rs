use spacetimedb::{reducer, table, Identity, ReducerContext, ScheduleAt, SpacetimeType, Table};
use std::f32::consts::PI;

#[table(accessor = player, public)]
pub struct Player {
    #[primary_key]
    pub identity: Identity,
    pub name: String,
    pub online: bool,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub struct Waypoint {
    pub x: f32,
    pub y: f32,
    pub target_speed: f32,
}

#[table(accessor = ship, public)]
pub struct Ship {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub owner: Identity,
    pub x: f32,
    pub y: f32,
    pub heading: f32, // In radians
    pub speed: f32,
    pub waypoint: Option<Waypoint>,
}

#[table(accessor = physics_timer, scheduled(physics_tick))]
pub struct PhysicsTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

const MAX_TURN_RATE: f32 = 1.0; // Radians per second
const MAX_ACCELERATION: f32 = 2.0; // Units per second squared
const TICK_RATE_MS: u64 = 100; // 10Hz

pub fn calculate_kinematics(
    x: f32,
    y: f32,
    heading: f32,
    speed: f32,
    waypoint: Option<Waypoint>,
    dt: f32,
) -> (f32, f32, f32, f32, Option<Waypoint>) {
    let mut new_heading = heading;
    let mut new_speed = speed;

    if let Some(wp) = &waypoint {
        let dx = wp.x - x;
        let dy = wp.y - y;
        let distance = (dx * dx + dy * dy).sqrt();

        // Arrival tolerance
        if distance <= 1.0 {
            return (wp.x, wp.y, heading, speed, None);
        }

        let target_heading = dy.atan2(dx);

        let mut diff = target_heading - heading;
        while diff > PI {
            diff -= 2.0 * PI;
        }
        while diff < -PI {
            diff += 2.0 * PI;
        }

        let max_turn = MAX_TURN_RATE * dt;
        if diff > max_turn {
            new_heading = heading + max_turn;
        } else if diff < -max_turn {
            new_heading = heading - max_turn;
        } else {
            new_heading = target_heading;
        }

        while new_heading > PI {
            new_heading -= 2.0 * PI;
        }
        while new_heading < -PI {
            new_heading += 2.0 * PI;
        }

        let speed_diff = wp.target_speed - speed;
        let max_accel = MAX_ACCELERATION * dt;
        if speed_diff > max_accel {
            new_speed += max_accel;
        } else if speed_diff < -max_accel {
            new_speed -= max_accel;
        } else {
            new_speed = wp.target_speed;
        }
    }

    let new_x = x + new_speed * new_heading.cos() * dt;
    let new_y = y + new_speed * new_heading.sin() * dt;

    (new_x, new_y, new_heading, new_speed, waypoint)
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kinematics_no_waypoint() {
        let (x, y, heading, speed, wp) = calculate_kinematics(0.0, 0.0, 0.0, 10.0, None, 0.1);

        assert_eq!(x, 1.0); // 10.0 speed * 0.1 dt
        assert_eq!(y, 0.0);
        assert_eq!(heading, 0.0);
        assert_eq!(speed, 10.0);
        assert_eq!(wp, None);
    }

    #[test]
    fn test_kinematics_turn_towards_waypoint() {
        let wp = Waypoint {
            x: 0.0,
            y: 10.0,
            target_speed: 10.0,
        };
        // Initial heading is 0 (facing right), waypoint is directly up (PI/2)
        // With MAX_TURN_RATE = 1.0, dt = 0.1, we can turn 0.1 radians
        let (_x, _y, heading, _speed, _next_wp) =
            calculate_kinematics(0.0, 0.0, 0.0, 10.0, Some(wp), 0.1);

        assert!(heading > 0.0 && heading <= 0.10001);
    }

    #[test]
    fn test_kinematics_arrive_at_waypoint() {
        let wp = Waypoint {
            x: 0.5,
            y: 0.0,
            target_speed: 0.0,
        };
        // We are within 1.0 of the waypoint
        let (x, y, _heading, _speed, next_wp) =
            calculate_kinematics(0.0, 0.0, 0.0, 10.0, Some(wp), 0.1);

        assert_eq!(x, 0.5);
        assert_eq!(y, 0.0);
        assert_eq!(next_wp, None);
    }

    #[test]
    fn test_kinematics_acceleration() {
        let wp = Waypoint {
            x: 10.0,
            y: 0.0,
            target_speed: 10.0,
        };
        // Initial speed is 0.0, target is 10.0. With MAX_ACCELERATION = 2.0 and dt = 0.1, we should accelerate by 0.2
        let (_x, _y, _heading, speed, _next_wp) =
            calculate_kinematics(0.0, 0.0, 0.0, 0.0, Some(wp), 0.1);

        assert_eq!(speed, 0.2); // This will fail initially because calculate_kinematics doesn't accelerate
    }

    #[test]
    fn test_simulation_until_arrival() {
        let wp = Waypoint {
            x: 10.0,
            y: 10.0,
            target_speed: 10.0,
        };
        let mut x = 0.0;
        let mut y = 0.0;
        let mut heading = 0.0;
        let mut speed = 10.0;
        let mut current_wp = Some(wp);
        let dt = 0.1;

        let mut ticks = 0;
        while current_wp.is_some() && ticks < 200 {
            let (new_x, new_y, new_heading, new_speed, new_wp) =
                calculate_kinematics(x, y, heading, speed, current_wp.clone(), dt);
            x = new_x;
            y = new_y;
            heading = new_heading;
            speed = new_speed;
            current_wp = new_wp;
            ticks += 1;
        }

        assert!(current_wp.is_none());
        assert!((x - 10.0).abs() <= 1.0);
        assert!((y - 10.0).abs() <= 1.0);
        assert!(ticks < 200, "Should arrive before 200 ticks");
    }
}
