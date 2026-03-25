use crate::types::Waypoint;
use std::f32::consts::PI;

pub const MAX_TURN_RATE: f32 = 1.0; // Radians per second
pub const MAX_ACCELERATION: f32 = 2.0; // Units per second squared
pub const TICK_RATE_MS: u64 = 100; // 10Hz
pub const ARRIVAL_DISTANCE: f32 = 1.0;

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
        if distance <= ARRIVAL_DISTANCE {
            return (wp.x, wp.y, heading, wp.target_speed, None);
        }

        let target_heading = dy.atan2(dx);

        let diff = (target_heading - heading + PI).rem_euclid(2.0 * PI) - PI;

        let max_turn = MAX_TURN_RATE * dt;
        if diff > max_turn {
            new_heading = heading + max_turn;
        } else if diff < -max_turn {
            new_heading = heading - max_turn;
        } else {
            new_heading = target_heading;
        }

        new_heading = (new_heading + PI).rem_euclid(2.0 * PI) - PI;

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

    if new_speed < 0.0 {
        new_speed = 0.0;
    }

    let new_x = x + new_speed * new_heading.cos() * dt;
    let new_y = y + new_speed * new_heading.sin() * dt;

    (new_x, new_y, new_heading, new_speed, waypoint)
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
    fn test_kinematics_arrive_at_waypoint_preserves_target_speed() {
        let wp = Waypoint {
            x: 0.5,
            y: 0.0,
            target_speed: 5.0,
        };
        // We are within ARRIVAL_DISTANCE of the waypoint
        let (x, y, _heading, speed, next_wp) =
            calculate_kinematics(0.0, 0.0, 0.0, 10.0, Some(wp), 0.1);

        assert_eq!(x, 0.5);
        assert_eq!(y, 0.0);
        assert_eq!(
            speed, 5.0,
            "Speed should be updated to waypoint target speed upon arrival"
        );
        assert_eq!(next_wp, None);
    }

    #[test]
    fn test_kinematics_arrive_at_waypoint() {
        let wp = Waypoint {
            x: 0.5,
            y: 0.0,
            target_speed: 0.0,
        };
        // We are within 1.0 of the waypoint
        let (x, y, _heading, speed, next_wp) =
            calculate_kinematics(0.0, 0.0, 0.0, 10.0, Some(wp), 0.1);

        assert_eq!(x, 0.5);
        assert_eq!(y, 0.0);
        assert_eq!(speed, 0.0);
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

        assert_eq!(speed, 0.2);
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

    #[test]
    fn test_stop_after_arrival() {
        let wp = Waypoint {
            x: 5.0,
            y: 0.0,
            target_speed: 0.0,
        };
        let mut x = 0.0;
        let mut y = 0.0;
        let mut heading = 0.0;
        let mut speed = 10.0;
        let mut current_wp = Some(wp);
        let dt = 0.1;

        for _ in 0..100 {
            let (new_x, new_y, new_heading, new_speed, new_wp) =
                calculate_kinematics(x, y, heading, speed, current_wp.clone(), dt);
            x = new_x;
            y = new_y;
            heading = new_heading;
            speed = new_speed;
            current_wp = new_wp;
        }

        assert!(current_wp.is_none());
        assert_eq!(speed, 0.0, "Speed should be 0 after stopping at waypoint");
        assert!((x - 5.0).abs() < 1.1);
    }

    #[test]
    fn test_kinematics_turn_limit() {
        let wp = Waypoint {
            x: -10.0,
            y: 0.0,
            target_speed: 10.0,
        };
        let (_x, _y, heading, _speed, _next_wp) =
            calculate_kinematics(0.0, 0.0, -PI + 0.1, 10.0, Some(wp), 0.1);

        assert!((heading - (-PI)).abs() < 0.0001 || (heading - PI).abs() < 0.0001);
    }

    #[test]
    fn test_kinematics_turn_and_accelerate() {
        let wp = Waypoint {
            x: 10.0,
            y: 10.0,
            target_speed: 10.0,
        };
        let (x, y, heading, speed, _next_wp) =
            calculate_kinematics(0.0, 0.0, 0.0, 0.0, Some(wp), 0.1);

        assert!(heading > 0.0 && heading <= 0.10001);
        assert_eq!(speed, 0.2);
        assert!(x > 0.0);
        assert!(y > 0.0);
    }

    #[test]
    fn test_kinematics_overshoot_and_circle_back() {
        let wp = Waypoint {
            x: -1.0,
            y: 0.0,
            target_speed: 10.0,
        };
        let mut x = 0.0;
        let mut y = 0.0;
        let mut heading = 0.0;
        let mut speed = 10.0;
        let mut current_wp = Some(wp);
        let dt = 0.1;

        let mut ticks = 0;
        while current_wp.is_some() && ticks < 500 {
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
        assert!((x - (-1.0)).abs() <= 1.0);
        assert!((y - 0.0).abs() <= 1.0);
    }

    #[test]
    fn test_negative_target_speed() {
        let wp = Waypoint {
            x: 10.0,
            y: 0.0,
            target_speed: -5.0,
        };
        // Initial speed 0, target speed -5.0. Should NOT become negative.
        let (_x, _y, _heading, speed, _next_wp) =
            calculate_kinematics(0.0, 0.0, 0.0, 0.0, Some(wp), 0.1);

        assert_eq!(speed, 0.0);
    }
}
