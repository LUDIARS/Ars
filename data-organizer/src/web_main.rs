use std::env;

#[tokio::main]
async fn main() {
    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(5175);

    let static_dir = env::args().nth(1);

    data_organizer::web_server::serve(port, static_dir).await;
}
