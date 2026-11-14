//! Reads the champion select of the running League of Legends client through its local API (LCU).
//!
//! Read-only: the app only GETs the phase, the queue and the champion select session.
//! It never sends anything to the client.

pub mod client;
pub mod credentials;
pub mod state;

use std::time::{Duration, Instant};

pub use client::{LcuClient, LcuError};
pub use credentials::{discover, Credentials};
pub use state::{ChampSelect, ClientState, Mode, Queue};

/// Wait this long between two searches for the client while it is not found.
/// Looking for it reads every process of the machine: not something to do every poll.
pub const SEARCH_EVERY: Duration = Duration::from_secs(5);

/// Follows the League client across polls. Keeps the connection while requests succeed and
/// looks for the client again only when there is none, or after a failed request
/// (the port and password change on every client restart).
#[derive(Default)]
pub struct Watcher {
    client: Option<LcuClient>,
    last_search: Option<Instant>,
    /// State to repeat while waiting for the next search
    last_state: Option<ClientState>,
}

impl Watcher {
    /// One poll. A client that is starting up or refusing requests is `Unreachable`, not an error,
    /// so the window can say so.
    pub async fn poll(&mut self) -> ClientState {
        if let Some(client) = &self.client {
            match client.state().await {
                Ok(state) => return self.remember(state),
                Err(_) => {
                    // Restarted or closed: search again right away
                    self.client = None;
                    self.last_search = None;
                }
            }
        }

        if let (Some(searched), Some(state)) = (self.last_search, &self.last_state) {
            if searched.elapsed() < SEARCH_EVERY {
                return state.clone();
            }
        }
        self.last_search = Some(Instant::now());

        let found = tokio::task::spawn_blocking(discover).await.ok().flatten();
        let Some(credentials) = found else {
            return self.remember(ClientState::NoClient);
        };
        let client = match LcuClient::new(credentials) {
            Ok(client) => client,
            Err(error) => return self.remember(ClientState::Unreachable { reason: error.to_string() }),
        };
        let state = match client.state().await {
            Ok(state) => {
                self.client = Some(client);
                state
            }
            Err(error) => ClientState::Unreachable { reason: error.to_string() },
        };
        self.remember(state)
    }

    fn remember(&mut self, state: ClientState) -> ClientState {
        self.last_state = Some(state.clone());
        state
    }
}
