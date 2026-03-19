use std::env;

#[tokio::main]
async fn main() {
    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(5174);

    let static_dir = env::args().nth(1);

    resource_depot_lib::web_server::serve(port, static_dir).await;
}
