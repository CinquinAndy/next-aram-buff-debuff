//! Desktop app: polls the League client and sends its state to the window,
//! loads the champion balance from the site (with an offline copy).

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use aram_lcu::{ClientState, Watcher};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};

/// Champion balance, served by the site (see `src/app/api/champions/route.ts`)
const CHAMPIONS_URL: &str = "https://aram-balances-checker.forhives.fr/api/champions";
const USER_AGENT: &str = concat!(
    "AramBalanceChecker-Desktop/",
    env!("CARGO_PKG_VERSION"),
    " (+https://github.com/CinquinAndy/next-aram-buff-debuff)"
);
const POLL_EVERY: Duration = Duration::from_millis(1500);
const CACHE_FILE: &str = "champions.json";

/// Last state sent to the window, so a window that (re)loads gets it at once
#[derive(Default)]
struct LastState(Mutex<Option<ClientState>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ChampionsPayload {
    data: Value,
    /// True when the site could not be reached and the saved copy is shown
    from_cache: bool,
    /// Why the site could not be reached, when it could not
    error: Option<String>,
}

fn cache_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_cache_dir().ok().map(|dir| dir.join(CACHE_FILE))
}

async fn fetch_champions() -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client.get(CHAMPIONS_URL).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("{CHAMPIONS_URL} answered {}", response.status()));
    }
    let data: Value = response.json().await.map_err(|e| e.to_string())?;
    match data.get("champions").and_then(Value::as_array) {
        Some(champions) if !champions.is_empty() => Ok(data),
        _ => Err("the site sent no champions".to_string()),
    }
}

/// Champion balance from the site; the last good copy when the site can't be reached
#[tauri::command]
async fn load_champions(app: AppHandle) -> Result<ChampionsPayload, String> {
    let cache = cache_path(&app);
    match fetch_champions().await {
        Ok(data) => {
            if let Some(path) = &cache {
                let _ = std::fs::create_dir_all(path.parent().expect("file in a folder"));
                let _ = std::fs::write(path, data.to_string());
            }
            Ok(ChampionsPayload { data, from_cache: false, error: None })
        }
        Err(error) => {
            let saved = cache
                .and_then(|path| std::fs::read_to_string(path).ok())
                .and_then(|text| serde_json::from_str::<Value>(&text).ok());
            match saved {
                Some(data) => Ok(ChampionsPayload { data, from_cache: true, error: Some(error) }),
                None => Err(error),
            }
        }
    }
}

#[tauri::command]
fn client_state(state: State<'_, LastState>) -> Option<ClientState> {
    state.0.lock().expect("not poisoned").clone()
}

/// Poll the League client forever; emit `client-state` when something changed
async fn watch_client(app: AppHandle) {
    let mut watcher = Watcher::default();
    loop {
        let state = watcher.poll().await;
        let changed = {
            let last = app.state::<LastState>();
            let mut last = last.0.lock().expect("not poisoned");
            let changed = last.as_ref() != Some(&state);
            *last = Some(state.clone());
            changed
        };
        if changed {
            let _ = app.emit("client-state", &state);
        }
        tokio::time::sleep(POLL_EVERY).await;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(LastState::default())
        .invoke_handler(tauri::generate_handler![load_champions, client_state])
        .setup(|app| {
            tauri::async_runtime::spawn(watch_client(app.handle().clone()));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the app");
}
