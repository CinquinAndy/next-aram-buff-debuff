//! HTTP client for the local League client API (LCU).
//!
//! The client listens on `https://127.0.0.1:<port>` with a certificate signed by Riot's own
//! authority, not a public one. Certificate checks are turned off for this client only, which
//! only ever calls 127.0.0.1 with the per-session password: nothing leaves the machine.

use std::time::Duration;

use base64::Engine;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION};
use serde_json::Value;

use crate::credentials::Credentials;
use crate::state::{parse_champ_select, parse_queue, ClientState};

#[derive(Debug, thiserror::Error)]
pub enum LcuError {
    #[error("request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("{path} answered {status}")]
    Status { path: String, status: u16 },
}

pub struct LcuClient {
    http: reqwest::Client,
    base: String,
    credentials: Credentials,
}

impl LcuClient {
    pub fn new(credentials: Credentials) -> Result<Self, LcuError> {
        Self::with_base(credentials.clone(), format!("https://127.0.0.1:{}", credentials.port))
    }

    /// Client for another base URL (tests use a local plain-HTTP server)
    pub fn with_base(credentials: Credentials, base: String) -> Result<Self, LcuError> {
        let token = base64::engine::general_purpose::STANDARD.encode(format!("riot:{}", credentials.password));
        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Basic {token}")).expect("base64 is ASCII"));
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .danger_accept_invalid_certs(true)
            .timeout(Duration::from_secs(3))
            .no_proxy()
            .build()?;
        Ok(Self { http, base, credentials })
    }

    pub fn credentials(&self) -> &Credentials {
        &self.credentials
    }

    /// GET a JSON endpoint. `Ok(None)` on 404: the client answers 404 outside the matching phase.
    async fn get(&self, path: &str) -> Result<Option<Value>, LcuError> {
        let response = self.http.get(format!("{}{path}", self.base)).send().await?;
        match response.status().as_u16() {
            404 => Ok(None),
            status if !(200..300).contains(&status) => Err(LcuError::Status { path: path.to_string(), status }),
            _ => Ok(Some(response.json().await?)),
        }
    }

    /// Current phase, queue and champion select, in one call per endpoint
    pub async fn state(&self) -> Result<ClientState, LcuError> {
        let phase = self
            .get("/lol-gameflow/v1/gameflow-phase")
            .await?
            .and_then(|value| value.as_str().map(str::to_string))
            .unwrap_or_else(|| "None".to_string());
        let queue = self.get("/lol-gameflow/v1/session").await?.as_ref().and_then(parse_queue);

        if phase != "ChampSelect" {
            return Ok(ClientState::Idle { phase, queue });
        }
        match self.get("/lol-champ-select/v1/session").await? {
            Some(session) => Ok(ClientState::ChampSelect { queue, champ_select: parse_champ_select(&session) }),
            // Champion select just ended: the next poll shows the new phase
            None => Ok(ClientState::Idle { phase, queue }),
        }
    }
}
