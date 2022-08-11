from dotenv import dotenv_values
import requests
import webbrowser
import websocket
import json
from lib.math import normalize_heading
import time

game_id = None


def on_message(ws: websocket.WebSocketApp, message):
    [action, payload] = json.loads(message)

    if action != "game-instance":
        print([action, payload])
        return

     # New game tick arrived!
    game_state = json.loads(payload["gameState"])
    commands = generate_commands(game_state)
    
    time.sleep(0.25) # Renders smoother if we wait a bit
    ws.send(json.dumps(["run-command", {"gameId": game_id, "payload": commands}]))


def on_error(ws: websocket.WebSocketApp, error):
    print(error)


def on_open(ws: websocket.WebSocketApp):
    print("OPENED")
    ws.send(json.dumps(["sub-game", {"id": game_id}]))


def on_close(ws, close_status_code, close_msg):
    print("CLOSED")


# Change this to your own implementation
def generate_commands(game_state):
    commands = []
    for aircraft in game_state["aircrafts"]:
        # Go loopy loop
        new_dir = normalize_heading(aircraft['direction'] + 20)
        commands.append(f"HEAD {aircraft['id']} {new_dir}")

    return commands


def main():
    config = dotenv_values()
    game_instance = requests.post(
        f"http://nonut:3001/api/levels/{config['LEVEL_ID']}",
        headers={
            "Authorization": config["TOKEN"]
        }).json()

    global game_id
    game_id = game_instance["entityId"]

    print(f"Game at http://nonut/games/{game_id}")
    webbrowser.open(f"http://nonut/games/{game_id}", new=2)
    time.sleep(2)

    ws = websocket.WebSocketApp(
        f"ws://nonut:3001/{config['TOKEN']}/", on_message=on_message, on_open=on_open, on_close=on_close, on_error=on_error)
    ws.run_forever()


if __name__ == "__main__":
    main()
