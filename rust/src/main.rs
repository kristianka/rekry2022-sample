use dotenv::dotenv;
use json_types::*;
use serde_json::Value;
use std::thread;
use std::time::Duration;
use std::{env, net::TcpStream};
use tungstenite::{connect, stream::MaybeTlsStream, Message, WebSocket};

mod json_types;

const FRONTEND_BASE: &str = "nonut";
const BACKEND_BASE: &str = "nonut:3001";

// Normalize any angle to 0-359
fn normalize_heading(heading: i32) -> i32 {
    (heading + 360) % 360
}

fn get_env_var(name: &str) -> String {
    env::vars()
        .find_map(|(k, v)| if k == name { Some(v) } else { None })
        .unwrap()
}

// Change this to your own implementation
fn generate_commands(game_state: GameState) -> Vec<String> {
    let mut commands: Vec<String> = Vec::new();

    for aircraft in game_state.aircrafts.iter() {
        // Go loopy loop
        let new_dir = normalize_heading(aircraft.direction + 20);
        commands.push(format!("HEAD {} {}", aircraft.id, new_dir));
    }

    commands
}

fn handle_game_instance(socket: &mut WebSocket<MaybeTlsStream<TcpStream>>, data: Value) {
    // Got a game tick, lets parse it
    let game_state_data: GameInstance = serde_json::from_value(data).unwrap();
    let game_state: GameState = serde_json::from_str(&game_state_data.game_state).unwrap();

    // and send back our commands based on game state
    let commands = generate_commands(game_state);

    thread::sleep(Duration::from_millis(250)); // Renders smoother if we wait a bit
    let response = serde_json::to_string(&(
        "run-command",
        RunCommandData {
            game_id: game_state_data.entity_id,
            payload: commands,
        },
    ))
    .unwrap();
    socket.write_message(Message::text(response)).unwrap();
}

fn handle_socket(mut socket: WebSocket<MaybeTlsStream<TcpStream>>) {
    loop {
        match socket.read_message().unwrap() {
            Message::Text(content) => {
                let message: (&str, Value) = serde_json::from_str(&content).unwrap();
                match message {
                    ("game-instance", data) => handle_game_instance(&mut socket, data),
                    ("success", data) => println!("success: {data}"),
                    ("failure", data) => println!("failure: {data}"),
                    _ => println!("Unhandled message: {message:?}"),
                }
            }
            Message::Close(_) => {
                println!("CLOSED");
                break;
            }
            Message::Ping(data) => socket.write_message(Message::Pong(data)).unwrap(),
            msg => {
                println!("Unhandled message type: {:?}", msg)
            }
        }
    }
}

fn create_game(level_id: &str, token: &str) -> GameInstance {
    let client = reqwest::blocking::Client::new();
    let res = client
        .post(format!("http://{BACKEND_BASE}/api/levels/{level_id}"))
        .header(reqwest::header::AUTHORIZATION, token)
        .send()
        .unwrap();

    if !res.status().is_success() {
        panic!(
            "Couldn't create game: {} - {}",
            res.status().canonical_reason().unwrap(),
            res.text().unwrap()
        );
    }

    serde_json::from_str(&res.text().unwrap()).unwrap()
}

fn main() {
    dotenv().unwrap();

    let token = get_env_var("TOKEN");
    let level_id = get_env_var("LEVEL_ID");

    let game_instance = create_game(&level_id, &token);
    let game_id = game_instance.entity_id;

    let game_url = format!("http://{FRONTEND_BASE}/games/{game_id}");
    println!("Game at {game_url}");
    open::that(game_url).unwrap();
    thread::sleep(Duration::from_secs(2));

    let ws_url = format!("ws://{BACKEND_BASE}/{token}/");
    let (mut socket, _) = connect(ws_url).unwrap();
    let sub_message = serde_json::to_string(&("sub-game", SubGameData { id: game_id })).unwrap();
    socket.write_message(Message::text(sub_message)).unwrap();

    handle_socket(socket);
}
