use crate::physics::TICK_RATE_MS;
use crate::tables::{
    physics_timer as PhysicsTimerTable, player as PlayerTable, PhysicsTimer, Player,
};
use spacetimedb::{reducer, ReducerContext, ScheduleAt, Table};

pub mod physics;
pub mod player;
pub mod ship;

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
