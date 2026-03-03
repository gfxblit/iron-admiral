use spacetimedb::{table, Identity, ScheduleAt, SpacetimeType};

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

#[table(accessor = physics_timer, scheduled(crate::reducers::physics_tick))]
pub struct PhysicsTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}
