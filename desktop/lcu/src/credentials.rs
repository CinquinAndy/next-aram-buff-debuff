//! Finding the port and password of the running League client.
//!
//! The client writes them twice: in the arguments of `LeagueClientUx`
//! (`--app-port=…`, `--remoting-auth-token=…`) and in a `lockfile`
//! (`LeagueClient:<pid>:<port>:<password>:https`) in its install folder.
//! The arguments work whatever the install path; the lockfile is the fallback.

use std::path::{Path, PathBuf};

use sysinfo::{ProcessRefreshKind, RefreshKind, System, UpdateKind};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Credentials {
    pub port: u16,
    pub password: String,
}

/// Parse a lockfile: `LeagueClient:21976:59633:Xyz-password:https`.
pub fn parse_lockfile(content: &str) -> Option<Credentials> {
    let parts: Vec<&str> = content.trim().split(':').collect();
    if parts.len() < 5 {
        return None;
    }
    let port = parts[2].parse().ok()?;
    let password = parts[3].to_string();
    if password.is_empty() {
        return None;
    }
    Some(Credentials { port, password })
}

/// Read `--app-port=` and `--remoting-auth-token=` from `LeagueClientUx` arguments.
pub fn parse_client_args<S: AsRef<str>>(args: &[S]) -> Option<Credentials> {
    let mut port = None;
    let mut password = None;
    for arg in args {
        let arg = arg.as_ref().trim_matches('"');
        if let Some(value) = arg.strip_prefix("--app-port=") {
            port = value.parse().ok();
        } else if let Some(value) = arg.strip_prefix("--remoting-auth-token=") {
            password = Some(value.to_string());
        }
    }
    Some(Credentials { port: port?, password: password.filter(|p| !p.is_empty())? })
}

/// Default install folders, where the lockfile is when the process can't be read.
fn default_install_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if cfg!(target_os = "windows") {
        for drive in ["C", "D", "E"] {
            dirs.push(PathBuf::from(format!(r"{drive}:\Riot Games\League of Legends")));
        }
    } else if cfg!(target_os = "macos") {
        dirs.push(PathBuf::from("/Applications/League of Legends.app/Contents/LoL"));
    }
    dirs
}

fn read_lockfile(dir: &Path) -> Option<Credentials> {
    parse_lockfile(&std::fs::read_to_string(dir.join("lockfile")).ok()?)
}

fn is_client_process(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    name == "leagueclientux.exe" || name == "leagueclientux"
}

/// Find the credentials of the running client, or None when it is not running.
pub fn discover() -> Option<Credentials> {
    let system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(
            ProcessRefreshKind::nothing()
                .with_cmd(UpdateKind::Always)
                .with_exe(UpdateKind::Always),
        ),
    );
    let mut install_dirs = Vec::new();
    let mut found_process = false;

    for process in system.processes().values() {
        if !is_client_process(&process.name().to_string_lossy()) {
            continue;
        }
        found_process = true;
        let args: Vec<String> = process.cmd().iter().map(|a| a.to_string_lossy().into_owned()).collect();
        if let Some(credentials) = parse_client_args(&args) {
            return Some(credentials);
        }
        // Arguments hidden (another user, elevated client): the lockfile sits next to the executable
        if let Some(dir) = process.exe().and_then(Path::parent) {
            install_dirs.push(dir.to_path_buf());
        }
    }

    // A lockfile without a running client is stale; only trust it while the client runs
    if !found_process {
        return None;
    }
    install_dirs.extend(default_install_dirs());
    install_dirs.iter().find_map(|dir| read_lockfile(dir))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_lockfile() {
        assert_eq!(
            parse_lockfile("LeagueClient:21976:59633:Xyz_Ab-12:https\n"),
            Some(Credentials { port: 59633, password: "Xyz_Ab-12".into() })
        );
    }

    #[test]
    fn refuses_a_broken_lockfile() {
        assert_eq!(parse_lockfile(""), None);
        assert_eq!(parse_lockfile("LeagueClient:1:notaport:pw:https"), None);
        assert_eq!(parse_lockfile("LeagueClient:1:123::https"), None);
    }

    #[test]
    fn reads_the_client_arguments() {
        let args = [
            r"C:\Riot Games\League of Legends\LeagueClientUx.exe",
            "--riotclient-auth-token=other",
            "\"--remoting-auth-token=AbC-123\"",
            "--app-port=51234",
        ];
        assert_eq!(
            parse_client_args(&args),
            Some(Credentials { port: 51234, password: "AbC-123".into() })
        );
    }

    #[test]
    fn needs_both_port_and_token() {
        assert_eq!(parse_client_args(&["--app-port=51234"]), None);
        assert_eq!(parse_client_args(&["--remoting-auth-token=abc"]), None);
    }

    #[test]
    fn recognises_the_client_process() {
        assert!(is_client_process("LeagueClientUx.exe"));
        assert!(is_client_process("LeagueClientUx"));
        assert!(!is_client_process("LeagueClientUxRender.exe"));
    }
}
