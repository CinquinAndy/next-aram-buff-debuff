//! The LCU client against a fake League client: a local HTTP server answering like the real one.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use aram_lcu::{ChampSelect, ClientState, Credentials, LcuClient, Mode, Queue};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

type Routes = HashMap<&'static str, (u16, String)>;

/// Serve `routes` (path → status, body); records the Authorization header of every request
async fn fake_client(routes: Routes) -> (String, Arc<Mutex<Vec<String>>>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let auth = Arc::new(Mutex::new(Vec::new()));
    let seen = auth.clone();

    tokio::spawn(async move {
        loop {
            let (mut socket, _) = listener.accept().await.unwrap();
            let routes = routes.clone();
            let seen = seen.clone();
            tokio::spawn(async move {
                let mut buffer = vec![0; 8192];
                let read = socket.read(&mut buffer).await.unwrap();
                let request = String::from_utf8_lossy(&buffer[..read]).to_string();
                let path = request.split_whitespace().nth(1).unwrap_or("/").to_string();
                if let Some(line) = request.lines().find(|l| l.to_ascii_lowercase().starts_with("authorization:")) {
                    seen.lock().unwrap().push(line.split_once(':').unwrap().1.trim().to_string());
                }
                let (status, body) = routes.get(path.as_str()).cloned().unwrap_or((404, "{}".into()));
                let response = format!(
                    "HTTP/1.1 {status} X\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                );
                socket.write_all(response.as_bytes()).await.unwrap();
            });
        }
    });
    (base, auth)
}

fn fixture(name: &str) -> String {
    std::fs::read_to_string(format!("{}/tests/fixtures/{name}", env!("CARGO_MANIFEST_DIR"))).unwrap()
}

fn credentials() -> Credentials {
    Credentials { port: 0, password: "secret-pw".into() }
}

#[tokio::test]
async fn reads_a_mayhem_champion_select() {
    let routes: Routes = HashMap::from([
        ("/lol-gameflow/v1/gameflow-phase", (200, "\"ChampSelect\"".to_string())),
        ("/lol-gameflow/v1/session", (200, fixture("gameflow-session-mayhem.json"))),
        ("/lol-champ-select/v1/session", (200, fixture("champ-select-aram.json"))),
    ]);
    let (base, auth) = fake_client(routes).await;

    let state = LcuClient::with_base(credentials(), base).unwrap().state().await.unwrap();

    assert_eq!(
        state,
        ClientState::ChampSelect {
            queue: Some(Queue { id: Some(2400), name: Some("ARAM: Mayhem".into()), mode: Mode::Mayhem }),
            champ_select: ChampSelect {
                my_champion_id: Some(266),
                team: vec![103, 266, 84, 12, 32],
                bench: vec![1, 22, 157],
                bench_enabled: true,
            },
        }
    );
    // Basic auth with the user "riot" and the session password
    assert!(auth.lock().unwrap().iter().all(|header| header == "Basic cmlvdDpzZWNyZXQtcHc="));
}

#[tokio::test]
async fn is_idle_outside_champion_select() {
    let routes: Routes = HashMap::from([("/lol-gameflow/v1/gameflow-phase", (200, "\"Lobby\"".to_string()))]);
    let (base, _) = fake_client(routes).await;

    let state = LcuClient::with_base(credentials(), base).unwrap().state().await.unwrap();
    assert_eq!(state, ClientState::Idle { phase: "Lobby".into(), queue: None });
}

#[tokio::test]
async fn reports_a_refused_request() {
    let routes: Routes = HashMap::from([("/lol-gameflow/v1/gameflow-phase", (401, "{}".to_string()))]);
    let (base, _) = fake_client(routes).await;

    let error = LcuClient::with_base(credentials(), base).unwrap().state().await.unwrap_err();
    assert_eq!(error.to_string(), "/lol-gameflow/v1/gameflow-phase answered 401");
}

#[tokio::test]
async fn watcher_reports_no_client_when_league_is_not_running() {
    // CI machines and this test run have no League client
    let mut watcher = aram_lcu::Watcher::default();
    assert_eq!(watcher.poll().await, ClientState::NoClient);
    // Within SEARCH_EVERY the last state is repeated without searching again
    assert_eq!(watcher.poll().await, ClientState::NoClient);
}
