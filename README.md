# Instructions

## Getting the token
- Navigate to http://nonut
- Enter any email and press `Get token`

## Levels and Games

The whole system consists of levels and game instances.

Level is a static representation of a initial game state and you can play specific level by creating a game instance from the levels initial game state.

Each game instance is tagged with your token, and only you can make edits to it. Viewing a game is possible as long as you know the games entity id.

Each edit you make to a game is also saved and it's possible to fetch a replay of games instances game states.

## API

The backend of the game consists of two distincs API's.
- `HTTP REST` at `http://nonut:3001/api`
- `WebSocket` at `ws://nonut:3001/:token`

To authenticate against the HTTP with your token you can use the `Authorization: <token>` header. For websockets your auth token is the endpoint you connect to.

List of available HTTP API's:

- POST `/api/token`: Creates a new user and returns the token
- GET `/api/games`: Returns all game instances owned by the user
- GET `/api/games/:id`: Returns a game instance with the given id
- GET `/api/games/replay/:id`: Returns a replay of the game instance with the given id
- GET `/api/levels`: Returns all levels
- POST `/api/levels/:id`: Creates a new game instance from the level with the given id

All the websocket messages are stringified JSON objects in the format of:

```json
["action-name", {...}]
```

Where the payload depends on the action.

List of available WebSockets actions and respective their payloads:

```ts
type Messages = {
  "sub-game": { // Subscribes the WebSocket to the game with the given id
    id: string
  }
  "game-instance": { // Updated game instance. Only sent from the server
    gameState: string
    status: string
    reason: string
    createdAt: Date
    gameType: string
    entityId: string
  }
  "run-command": { // Send commands for the game engine. Payload depends on the game type
    gameId: string
    payload: unknown
  }
  "success": { // General purpose success message
    message: string
  }
  "failure":  { // General purpose failure message
    reason: "Forbidden" | "Internal Server Error" | "Bad Request"
    desc?: string
  }
}
```

**ALWAYS REMEMBER TO STRINGIFY THE PAYLOADS BEFORE SENDING THEM!** \
The websocket only accepts string data!

## Game Mechanics

### Overview

The goal of the game is to steer airplanes and land them into airports.
In order to land an airplane to an airport:
- Distance from airplane to airport needs to be `10` or less
- Their directions must match exactly

The airplanes have a limited turning radius. They change their direction by at most `20 degrees` per tick.

If two airplanes get within `20` units of each other they will collide and the game ends.

### Game state

You receive the game state with websockets by subscribing to it.
It contains all the necessary information to steer the planes.

The websocket message payload has a `gameState` key, which contains the current state of the game as a stringified JSON. It contains the bounding box of the playing area, list of aircrafts, list of airports, and your score.

All positions are relative to the bounding box. All directions are based on the unit circle and in degrees, 0 being right and increasing counter clockwise. E.g. 0 is right, 90 is up, 180 is left, and 270 is down.


### Score

Your score increases by 1 when:
- a new game tick is processed
- a command is received

Lowest score wins.

### Commands

You send commands with the websocket to update the state.
The message data is stringified JSON in the format:
```json
["run-command", { gameId: "{game_id}", payload: [
	"HEAD {aircraft_id} {direction}",
	"HEAD {aircraft_id} {direction}"
]}]
```
The direction must be a whole number in range [0, 359].

One payload can contain multiple commands to control multiple aircrafts simultaneously. Each commands adds 1 to the score.





