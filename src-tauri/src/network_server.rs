use axum::{
    routing::get,
    Router,
    Json,
};
use serde::Serialize;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tauri::AppHandle;

#[derive(Serialize)]
pub struct PingResponse {
    status: String,
    app: String,
    version: String,
}

pub async fn start_lan_server(app_handle: AppHandle) {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/ping", get(|| async {
            Json(PingResponse {
                status: "ok".to_string(),
                app: "MizanNet".to_string(),
                version: "1.0.0".to_string(),
            })
        }))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3030));
    println!("LAN Sync server listening on {}", addr);
    
    // Check if port is already in use by trying to bind
    let listener = tokio::net::TcpListener::bind(addr).await;
    match listener {
        Ok(l) => {
            if let Err(e) = axum::serve(l, app).await {
                println!("LAN Sync server error: {}", e);
            }
        },
        Err(e) => {
            println!("Failed to start LAN server (port might be in use): {}", e);
        }
    }
}
