use spacetimedb::SpacetimeType;

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub struct Waypoint {
    pub x: f32,
    pub y: f32,
    pub target_speed: f32,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ShipClass {
    ArleighBurke, // DDG
    Carrier,      // CVN
}

impl ShipClass {
    pub fn max_speed(&self) -> f32 {
        match self {
            ShipClass::ArleighBurke => 30.0,
            ShipClass::Carrier => 35.0,
        }
    }

    pub fn ciws_probability(&self) -> f32 {
        match self {
            ShipClass::ArleighBurke => 0.75,
            ShipClass::Carrier => 0.60,
        }
    }
}
