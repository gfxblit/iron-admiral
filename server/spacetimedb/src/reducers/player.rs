use crate::tables::{player, Player};
use spacetimedb::{reducer, ReducerContext, Table};

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
