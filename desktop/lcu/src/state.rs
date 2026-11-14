//! What the app shows, read from the client's JSON answers.
//! Pure functions: the endpoints' JSON in, a small state out.

use serde::Serialize;
use serde_json::Value;

/// Which balance applies, from the queue of the current lobby or game
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Aram,
    Mayhem,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Queue {
    pub id: Option<i64>,
    pub name: Option<String>,
    pub mode: Mode,
}

/// Champions of the current champion select
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampSelect {
    /// Champion of the local player, when one is assigned
    pub my_champion_id: Option<i64>,
    /// Champions of the local player's team, in seat order (the player's included)
    pub team: Vec<i64>,
    /// ARAM bench: champions anyone on the team can swap for
    pub bench: Vec<i64>,
    pub bench_enabled: bool,
}

/// Everything the window needs, sent on every poll
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum ClientState {
    /// The League client is not running (or its credentials can't be read)
    NoClient,
    /// Running but not reachable yet (starting up, or the request failed)
    Unreachable { reason: String },
    /// Reachable, outside champion select
    #[serde(rename_all = "camelCase")]
    Idle { phase: String, queue: Option<Queue> },
    #[serde(rename_all = "camelCase")]
    ChampSelect { queue: Option<Queue>, champ_select: ChampSelect },
}

/// "ARAM: Mayhem" → Mayhem, "ARAM" → Aram, anything else → Other
pub fn mode_from_queue_name(name: &str) -> Mode {
    let name = name.to_ascii_lowercase();
    if name.contains("mayhem") {
        Mode::Mayhem
    } else if name.contains("aram") {
        Mode::Aram
    } else {
        Mode::Other
    }
}

/// Queue from `/lol-gameflow/v1/session` (`gameData.queue`)
pub fn parse_queue(gameflow_session: &Value) -> Option<Queue> {
    let queue = gameflow_session.pointer("/gameData/queue")?;
    let id = queue.get("id").and_then(Value::as_i64).filter(|id| *id > 0);
    let name = ["description", "name", "detailedDescription"]
        .iter()
        .filter_map(|key| queue.get(*key).and_then(Value::as_str))
        .find(|value| !value.is_empty())
        .map(str::to_string);
    if id.is_none() && name.is_none() {
        return None;
    }
    let mode = name.as_deref().map(mode_from_queue_name).unwrap_or(Mode::Other);
    Some(Queue { id, name, mode })
}

fn champion_id(value: &Value) -> Option<i64> {
    value.get("championId").and_then(Value::as_i64).filter(|id| *id > 0)
}

/// Champions from `/lol-champ-select/v1/session`
pub fn parse_champ_select(session: &Value) -> ChampSelect {
    let local_cell = session.get("localPlayerCellId").and_then(Value::as_i64);
    let my_team = session.get("myTeam").and_then(Value::as_array).cloned().unwrap_or_default();

    let my_champion_id = my_team
        .iter()
        .find(|member| member.get("cellId").and_then(Value::as_i64) == local_cell && local_cell.is_some())
        .and_then(champion_id);

    let team = my_team.iter().filter_map(champion_id).collect();
    let bench = session
        .get("benchChampions")
        .and_then(Value::as_array)
        .map(|bench| bench.iter().filter_map(champion_id).collect())
        .unwrap_or_default();

    ChampSelect {
        my_champion_id,
        team,
        bench,
        bench_enabled: session.get("benchEnabled").and_then(Value::as_bool).unwrap_or(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn fixture(name: &str) -> Value {
        let path = format!("{}/tests/fixtures/{name}", env!("CARGO_MANIFEST_DIR"));
        serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
    }

    #[test]
    fn reads_team_and_bench_of_an_aram_champ_select() {
        let state = parse_champ_select(&fixture("champ-select-aram.json"));
        assert_eq!(state.my_champion_id, Some(266));
        assert_eq!(state.team, vec![103, 266, 84, 12, 32]);
        assert_eq!(state.bench, vec![1, 22, 157]);
        assert!(state.bench_enabled);
    }

    #[test]
    fn skips_seats_without_a_champion() {
        let state = parse_champ_select(&json!({
            "localPlayerCellId": 0,
            "myTeam": [{ "cellId": 0, "championId": 0 }, { "cellId": 1, "championId": 99 }],
        }));
        assert_eq!(state.my_champion_id, None);
        assert_eq!(state.team, vec![99]);
        assert!(state.bench.is_empty());
        assert!(!state.bench_enabled);
    }

    #[test]
    fn tells_mayhem_from_aram() {
        assert_eq!(mode_from_queue_name("ARAM: Mayhem"), Mode::Mayhem);
        assert_eq!(mode_from_queue_name("ARAM"), Mode::Aram);
        assert_eq!(mode_from_queue_name("Ranked Solo/Duo"), Mode::Other);
    }

    #[test]
    fn reads_the_queue_of_the_gameflow_session() {
        let queue = parse_queue(&fixture("gameflow-session-mayhem.json")).unwrap();
        assert_eq!(queue, Queue { id: Some(2400), name: Some("ARAM: Mayhem".into()), mode: Mode::Mayhem });
        assert_eq!(parse_queue(&json!({ "phase": "None" })), None);
    }

    #[test]
    fn serialises_for_the_window() {
        let state = ClientState::ChampSelect {
            queue: Some(Queue { id: Some(450), name: Some("ARAM".into()), mode: Mode::Aram }),
            champ_select: ChampSelect { my_champion_id: Some(1), team: vec![1], bench: vec![], bench_enabled: true },
        };
        assert_eq!(
            serde_json::to_value(state).unwrap(),
            json!({
                "status": "champSelect",
                "queue": { "id": 450, "name": "ARAM", "mode": "aram" },
                "champSelect": { "myChampionId": 1, "team": [1], "bench": [], "benchEnabled": true },
            })
        );
        assert_eq!(serde_json::to_value(ClientState::NoClient).unwrap(), json!({ "status": "noClient" }));
    }
}
