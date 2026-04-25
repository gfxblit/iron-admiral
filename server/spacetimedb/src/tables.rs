use crate::reducers::physics::physics_tick;
use crate::types::{ShipClass, Waypoint};
use spacetimedb::{table, Identity, ScheduleAt};

#[table(accessor = player, public)]
#[derive(Clone)]
pub struct Player {
    #[primary_key]
    pub identity: Identity,
    pub nickname: Option<String>,
    pub online: bool,
}

#[table(accessor = ship, public)]
#[derive(Clone)]
pub struct Ship {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub owner_id: Identity,
    pub ship_class: ShipClass,
    pub x: f32,
    pub y: f32,
    pub heading: f32,
    pub speed: f32,
    pub radar_on: bool,
    pub waypoint: Option<Waypoint>,
}

#[table(accessor = physics_timer, scheduled(physics_tick))]
#[derive(Clone)]
pub struct PhysicsTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}

#[table(accessor = missile, public)]
#[derive(Clone)]
pub struct Missile {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub owner_id: Identity,
    pub x: f32,
    pub y: f32,
    pub heading: f32,
    pub speed: f32,
    pub target_x: f32,
    pub target_y: f32,
    pub target_ship_id: Option<u64>,
}
