#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{env, fs, net::UdpSocket, path::PathBuf, process::Command};
use tauri::{AppHandle, Manager};

const DEFAULT_API_BASE: &str = "https://api.veic.tech";
const KEYCHAIN_SERVICE: &str = "tech.veic.runtime";
const KEYCHAIN_USER: &str = "veic-runtime-jwt";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppCache {
    api_base_url: String,
    last_workspace_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeLog {
    id: i64,
    created_at: String,
    level: String,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CachedWorkspaceEvent {
    workspace_id: String,
    id: String,
    revision: i64,
    event_type: String,
    actor_user_id: Option<String>,
    subject_id: Option<String>,
    payload: Option<serde_json::Value>,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeProbe {
    hostname: String,
    username: String,
    os: String,
    arch: String,
    stable_resource_id: String,
    ipv4_addresses: Vec<String>,
    ipv6_addresses: Vec<String>,
    overlay: Option<TailscaleOverlayState>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TailscaleOverlayState {
    available: bool,
    backend_state: Option<String>,
    login_server: Option<String>,
    hostname: Option<String>,
    dns_name: Option<String>,
    machine_id: Option<String>,
    node_id: Option<String>,
    public_key: Option<String>,
    overlay_ips: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveAppCacheRequest {
    api_base_url: Option<String>,
    last_workspace_id: Option<String>,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            migrate(&handle)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_cache,
            save_app_cache,
            append_runtime_log,
            list_runtime_logs,
            clear_runtime_logs,
            save_workspace_events,
            list_workspace_events,
            get_workspace_event_cursor,
            clear_workspace_events,
            secure_get_token,
            secure_set_token,
            secure_delete_token,
            get_runtime_probe,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run VEIC Runtime");
}

#[tauri::command]
fn get_runtime_probe() -> Result<RuntimeProbe, String> {
    let hostname = detect_hostname();
    let username = detect_username();
    let mut ipv4_addresses = detect_ipv4_addresses();
    let mut ipv6_addresses = detect_ipv6_addresses();

    if let Some(primary_ipv4) = detect_primary_ipv4() {
        push_unique(&mut ipv4_addresses, primary_ipv4);
    }
    if let Some(primary_ipv6) = detect_primary_ipv6() {
        push_unique(&mut ipv6_addresses, primary_ipv6);
    }

    Ok(RuntimeProbe {
        stable_resource_id: stable_resource_id(&hostname, &username),
        hostname,
        username,
        os: env::consts::OS.to_string(),
        arch: env::consts::ARCH.to_string(),
        ipv4_addresses,
        ipv6_addresses,
        overlay: detect_tailscale_overlay_state(),
    })
}

#[tauri::command]
fn get_app_cache(app: AppHandle) -> Result<AppCache, String> {
    let db = open_db(&app)?;
    Ok(AppCache {
        api_base_url: get_setting(&db, "api_base_url")?.unwrap_or_else(|| DEFAULT_API_BASE.to_string()),
        last_workspace_id: get_setting(&db, "last_workspace_id")?.unwrap_or_default(),
    })
}

#[tauri::command]
fn save_app_cache(app: AppHandle, request: SaveAppCacheRequest) -> Result<AppCache, String> {
    let db = open_db(&app)?;
    if let Some(api_base_url) = request.api_base_url {
        set_setting(&db, "api_base_url", api_base_url.trim().trim_end_matches('/'))?;
    }
    if let Some(last_workspace_id) = request.last_workspace_id {
        set_setting(&db, "last_workspace_id", last_workspace_id.trim())?;
    }
    Ok(AppCache {
        api_base_url: get_setting(&db, "api_base_url")?.unwrap_or_else(|| DEFAULT_API_BASE.to_string()),
        last_workspace_id: get_setting(&db, "last_workspace_id")?.unwrap_or_default(),
    })
}

#[tauri::command]
fn append_runtime_log(app: AppHandle, level: String, message: String) -> Result<RuntimeLog, String> {
    let db = open_db(&app)?;
    let normalized_level = normalize_level(&level);
    let normalized_message: String = message.trim().chars().take(2000).collect();
    db.execute(
        "INSERT INTO runtime_logs (level, message) VALUES (?1, ?2)",
        params![normalized_level, normalized_message],
    )
    .map_err(db_error)?;
    let id = db.last_insert_rowid();
    db.query_row(
        "SELECT id, created_at, level, message FROM runtime_logs WHERE id = ?1",
        params![id],
        row_to_runtime_log,
    )
    .map_err(db_error)
}

#[tauri::command]
fn list_runtime_logs(app: AppHandle, limit: Option<i64>) -> Result<Vec<RuntimeLog>, String> {
    let db = open_db(&app)?;
    let limit = limit.unwrap_or(100).clamp(1, 500);
    let mut stmt = db
        .prepare(
            "SELECT id, created_at, level, message
             FROM runtime_logs
             ORDER BY id DESC
             LIMIT ?1",
        )
        .map_err(db_error)?;
    let rows = stmt
        .query_map(params![limit], row_to_runtime_log)
        .map_err(db_error)?;
    let mut logs = Vec::new();
    for row in rows {
        logs.push(row.map_err(db_error)?);
    }
    Ok(logs)
}

#[tauri::command]
fn clear_runtime_logs(app: AppHandle) -> Result<(), String> {
    let db = open_db(&app)?;
    db.execute("DELETE FROM runtime_logs", []).map_err(db_error)?;
    Ok(())
}

#[tauri::command]
fn save_workspace_events(
    app: AppHandle,
    workspace_id: String,
    events: Vec<CachedWorkspaceEvent>,
) -> Result<i64, String> {
    let workspace_id = workspace_id.trim().to_string();
    if workspace_id.is_empty() {
        return Ok(0);
    }
    let mut db = open_db(&app)?;
    let tx = db.transaction().map_err(db_error)?;
    for event in events {
        if event.revision <= 0 {
            continue;
        }
        let payload = serde_json::to_string(&event.payload.unwrap_or_else(|| serde_json::json!({})))
            .map_err(|error| format!("event payload encode failed: {error}"))?;
        tx.execute(
            r#"
            INSERT INTO workspace_event_cache (
              workspace_id, revision, event_id, event_type,
              actor_user_id, subject_id, payload_json, created_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(workspace_id, revision) DO UPDATE SET
              event_id = excluded.event_id,
              event_type = excluded.event_type,
              actor_user_id = excluded.actor_user_id,
              subject_id = excluded.subject_id,
              payload_json = excluded.payload_json,
              created_at = excluded.created_at,
              cached_at = CURRENT_TIMESTAMP
            "#,
            params![
                workspace_id,
                event.revision,
                event.id,
                event.event_type,
                event.actor_user_id,
                event.subject_id,
                payload,
                event.created_at,
            ],
        )
        .map_err(db_error)?;
    }
    tx.commit().map_err(db_error)?;
    get_workspace_event_cursor(app, workspace_id)
}

#[tauri::command]
fn list_workspace_events(
    app: AppHandle,
    workspace_id: String,
    limit: Option<i64>,
) -> Result<Vec<CachedWorkspaceEvent>, String> {
    let db = open_db(&app)?;
    let workspace_id = workspace_id.trim().to_string();
    if workspace_id.is_empty() {
        return Ok(Vec::new());
    }
    let limit = limit.unwrap_or(100).clamp(1, 500);
    let mut stmt = db
        .prepare(
            r#"
            SELECT workspace_id, revision, event_id, event_type,
                   actor_user_id, subject_id, payload_json, created_at
            FROM workspace_event_cache
            WHERE workspace_id = ?1
            ORDER BY revision DESC
            LIMIT ?2
            "#,
        )
        .map_err(db_error)?;
    let rows = stmt
        .query_map(params![workspace_id, limit], row_to_cached_workspace_event)
        .map_err(db_error)?;
    let mut events = Vec::new();
    for row in rows {
        events.push(row.map_err(db_error)?);
    }
    Ok(events)
}

#[tauri::command]
fn get_workspace_event_cursor(app: AppHandle, workspace_id: String) -> Result<i64, String> {
    let db = open_db(&app)?;
    let workspace_id = workspace_id.trim().to_string();
    if workspace_id.is_empty() {
        return Ok(0);
    }
    db.query_row(
        "SELECT COALESCE(MAX(revision), 0) FROM workspace_event_cache WHERE workspace_id = ?1",
        params![workspace_id],
        |row| row.get::<_, i64>(0),
    )
    .map_err(db_error)
}

#[tauri::command]
fn clear_workspace_events(app: AppHandle, workspace_id: String) -> Result<(), String> {
    let db = open_db(&app)?;
    db.execute(
        "DELETE FROM workspace_event_cache WHERE workspace_id = ?1",
        params![workspace_id.trim()],
    )
    .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
fn secure_get_token() -> Result<Option<String>, String> {
    let entry = keyring_entry()?;
    match entry.get_password() {
        Ok(token) if !token.trim().is_empty() => Ok(Some(token)),
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("keychain read failed: {error}")),
    }
}

#[tauri::command]
fn secure_set_token(token: String) -> Result<(), String> {
    if token.trim().is_empty() {
        return secure_delete_token();
    }
    keyring_entry()?
        .set_password(token.trim())
        .map_err(|error| format!("keychain write failed: {error}"))
}

#[tauri::command]
fn secure_delete_token() -> Result<(), String> {
    let entry = keyring_entry()?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("keychain delete failed: {error}")),
    }
}

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|error| format!("keychain unavailable: {error}"))
}

fn migrate(app: &AppHandle) -> Result<(), String> {
    let db = open_db(app)?;
    db.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS runtime_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          level TEXT NOT NULL,
          message TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_runtime_logs_created_at
          ON runtime_logs (created_at DESC);

        CREATE TABLE IF NOT EXISTS workspace_event_cache (
          workspace_id TEXT NOT NULL,
          revision INTEGER NOT NULL,
          event_id TEXT NOT NULL DEFAULT '',
          event_type TEXT NOT NULL DEFAULT '',
          actor_user_id TEXT,
          subject_id TEXT,
          payload_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          cached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (workspace_id, revision)
        );

        CREATE INDEX IF NOT EXISTS idx_workspace_event_cache_created_at
          ON workspace_event_cache (workspace_id, created_at DESC);
        "#,
    )
    .map_err(db_error)?;
    Ok(())
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let db = Connection::open(path).map_err(db_error)?;
    db.busy_timeout(std::time::Duration::from_millis(1500))
        .map_err(db_error)?;
    Ok(db)
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("cannot resolve app data dir: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("cannot create app data dir: {error}"))?;
    Ok(dir.join("veic-runtime-cache.sqlite3"))
}

fn get_setting(db: &Connection, key: &str) -> Result<Option<String>, String> {
    match db.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    ) {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(db_error(error)),
    }
}

fn set_setting(db: &Connection, key: &str, value: &str) -> Result<(), String> {
    db.execute(
        r#"
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (?1, ?2, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
        "#,
        params![key, value],
    )
    .map_err(db_error)?;
    Ok(())
}

fn row_to_runtime_log(row: &rusqlite::Row<'_>) -> rusqlite::Result<RuntimeLog> {
    Ok(RuntimeLog {
        id: row.get(0)?,
        created_at: row.get(1)?,
        level: row.get(2)?,
        message: row.get(3)?,
    })
}

fn row_to_cached_workspace_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<CachedWorkspaceEvent> {
    let payload_json: String = row.get(6)?;
    let payload = serde_json::from_str::<serde_json::Value>(&payload_json).ok();
    Ok(CachedWorkspaceEvent {
        workspace_id: row.get(0)?,
        revision: row.get(1)?,
        id: row.get(2)?,
        event_type: row.get(3)?,
        actor_user_id: row.get(4)?,
        subject_id: row.get(5)?,
        payload,
        created_at: row.get(7)?,
    })
}

fn normalize_level(level: &str) -> String {
    match level.trim().to_ascii_lowercase().as_str() {
        "error" | "warn" | "success" | "debug" => level.trim().to_ascii_lowercase(),
        _ => "info".to_string(),
    }
}

fn db_error(error: rusqlite::Error) -> String {
    format!("sqlite error: {error}")
}

fn detect_tailscale_overlay_state() -> Option<TailscaleOverlayState> {
    let output = match Command::new("tailscale").args(["status", "--json"]).output() {
        Ok(output) => output,
        Err(error) => {
            return Some(TailscaleOverlayState {
                available: false,
                backend_state: None,
                login_server: detect_tailscale_control_url(),
                hostname: None,
                dns_name: None,
                machine_id: None,
                node_id: None,
                public_key: None,
                overlay_ips: Vec::new(),
                error: Some(format!("tailscale status unavailable: {error}")),
            });
        }
    };

    if !output.status.success() {
        return Some(TailscaleOverlayState {
            available: false,
            backend_state: None,
            login_server: detect_tailscale_control_url(),
            hostname: None,
            dns_name: None,
            machine_id: None,
            node_id: None,
            public_key: None,
            overlay_ips: Vec::new(),
            error: Some(String::from_utf8_lossy(&output.stderr).trim().to_string()),
        });
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let value = match serde_json::from_str::<serde_json::Value>(&text) {
        Ok(value) => value,
        Err(error) => {
            return Some(TailscaleOverlayState {
                available: false,
                backend_state: None,
                login_server: detect_tailscale_control_url(),
                hostname: None,
                dns_name: None,
                machine_id: None,
                node_id: None,
                public_key: None,
                overlay_ips: Vec::new(),
                error: Some(format!("tailscale status json parse failed: {error}")),
            });
        }
    };

    let backend_state = json_string_at(&value, &["BackendState"]);
    let hostname = json_string_at(&value, &["Self", "HostName"]);
    let dns_name = json_string_at(&value, &["Self", "DNSName"]);
    let node_id = json_string_at(&value, &["Self", "ID"]);
    let public_key = json_string_at(&value, &["Self", "PublicKey"]);
    let machine_id = node_id
        .clone()
        .or_else(|| public_key.clone())
        .or_else(|| hostname.clone());
    let overlay_ips = json_string_array_at(&value, &["Self", "TailscaleIPs"]);
    let available = !overlay_ips.is_empty()
        && machine_id
            .as_deref()
            .map(|item| !item.trim().is_empty())
            .unwrap_or(false)
        && !matches!(backend_state.as_deref(), Some("NeedsLogin" | "NoState"));

    Some(TailscaleOverlayState {
        available,
        backend_state,
        login_server: detect_tailscale_control_url(),
        hostname,
        dns_name,
        machine_id,
        node_id,
        public_key,
        overlay_ips,
        error: None,
    })
}

fn detect_tailscale_control_url() -> Option<String> {
    let output = Command::new("tailscale").args(["debug", "prefs"]).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) {
        return json_string_at(&value, &["ControlURL"])
            .or_else(|| json_string_at(&value, &["ControlUrl"]))
            .or_else(|| json_string_at(&value, &["control_url"]));
    }
    for line in text.lines() {
        let normalized = line.to_ascii_lowercase();
        if normalized.contains("controlurl") || normalized.contains("control_url") {
            if let Some((_, value)) = line.split_once(':') {
                let cleaned = value.trim().trim_matches('"').trim_matches(',').to_string();
                if !cleaned.is_empty() {
                    return Some(cleaned);
                }
            }
        }
    }
    None
}

fn json_string_at(value: &serde_json::Value, path: &[&str]) -> Option<String> {
    let mut current = value;
    for key in path {
        current = current.get(*key)?;
    }
    current.as_str().map(|item| item.trim().to_string()).filter(|item| !item.is_empty())
}

fn json_string_array_at(value: &serde_json::Value, path: &[&str]) -> Vec<String> {
    let mut current = value;
    for key in path {
        match current.get(*key) {
            Some(value) => current = value,
            None => return Vec::new(),
        }
    }
    current
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(str::trim))
                .filter(|item| !item.is_empty())
                .map(ToString::to_string)
                .collect()
        })
        .unwrap_or_default()
}

fn detect_hostname() -> String {
    env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| {
            Command::new("hostname")
                .output()
                .ok()
                .and_then(|output| String::from_utf8(output.stdout).ok())
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| "veic-runtime-node".to_string())
        })
}

fn detect_username() -> String {
    env::var("USERNAME")
        .or_else(|_| env::var("USER"))
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "local-user".to_string())
}

fn stable_resource_id(hostname: &str, username: &str) -> String {
    let source = format!("{hostname}-{username}");
    let slug: String = source
        .to_ascii_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect();
    let compact = slug
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    format!("veic-runtime-{}", compact.trim_matches('-'))
}

fn detect_primary_ipv4() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let addr = socket.local_addr().ok()?;
    Some(addr.ip().to_string()).filter(|value| !value.starts_with("127."))
}

fn detect_primary_ipv6() -> Option<String> {
    let socket = UdpSocket::bind("[::]:0").ok()?;
    socket.connect("[2001:4860:4860::8888]:80").ok()?;
    let addr = socket.local_addr().ok()?;
    let value = addr.ip().to_string();
    Some(value).filter(|item| !item.starts_with("::1") && !item.starts_with("fe80:"))
}

fn detect_ipv4_addresses() -> Vec<String> {
    if cfg!(target_os = "windows") {
        return detect_windows_ipconfig("ipv4");
    }
    detect_unix_ip_addresses("inet")
}

fn detect_ipv6_addresses() -> Vec<String> {
    if cfg!(target_os = "windows") {
        return detect_windows_ipconfig("ipv6");
    }
    detect_unix_ip_addresses("inet6")
}

fn detect_windows_ipconfig(family: &str) -> Vec<String> {
    let output = Command::new("ipconfig").output();
    let text = match output.ok().and_then(|item| String::from_utf8(item.stdout).ok()) {
        Some(value) => value,
        None => return Vec::new(),
    };
    let needle = if family == "ipv6" { "ipv6" } else { "ipv4" };
    let mut values = Vec::new();
    for line in text.lines() {
        let normalized = line.to_ascii_lowercase();
        if !normalized.contains(needle) || normalized.contains("temporary") {
            continue;
        }
        if let Some((_, value)) = line.split_once(':') {
            let cleaned = clean_ip_value(value);
            if is_usable_ip(&cleaned, family) {
                push_unique(&mut values, cleaned);
            }
        }
    }
    values
}

fn detect_unix_ip_addresses(family: &str) -> Vec<String> {
    let output = Command::new("ip").args(["-o", "addr", "show"]).output();
    let text = match output.ok().and_then(|item| String::from_utf8(item.stdout).ok()) {
        Some(value) => value,
        None => return Vec::new(),
    };
    let mut values = Vec::new();
    for line in text.lines() {
        let mut parts = line.split_whitespace();
        while let Some(part) = parts.next() {
            if part == family {
                if let Some(value) = parts.next() {
                    let cleaned = value.split('/').next().unwrap_or(value).to_string();
                    if is_usable_ip(&cleaned, if family == "inet6" { "ipv6" } else { "ipv4" }) {
                        push_unique(&mut values, cleaned);
                    }
                }
            }
        }
    }
    values
}

fn clean_ip_value(value: &str) -> String {
    value
        .replace("(Preferred)", "")
        .replace("(Preferred)", "")
        .trim()
        .trim_matches('.')
        .trim()
        .to_string()
}

fn is_usable_ip(value: &str, family: &str) -> bool {
    if value.is_empty() {
        return false;
    }
    if family == "ipv6" {
        return value.contains(':') && !value.starts_with("fe80:") && value != "::1";
    }
    value.contains('.') && !value.starts_with("127.") && !value.starts_with("169.254.")
}

fn push_unique(values: &mut Vec<String>, value: String) {
    if !value.trim().is_empty() && !values.iter().any(|item| item == &value) {
        values.push(value);
    }
}
