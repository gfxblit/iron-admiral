use spacetimedb::SpacetimeType;

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub struct Waypoint {
    pub x: f32,
    pub y: f32,
    pub target_speed: f32,
}
