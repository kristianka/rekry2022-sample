# Instructions

## Getting the token
- Navigate to http://nonut
- Enter any email and press `Get token`

## Levels and Games

The whole system consists of levels and game instances.

Level is a static represantation of a initial game state and you can play spesific level by creating a game instance from the levels initial game state.

Each game instance is tagged with your token, and only you can make edits to it. Viewing a game is possible as long as you know the games entity id.

Each edit you make to a game is also saved and it's possible to fetch a replay of games instances game states.

## API

The backend of the game consists of two distincs API's.
- `HTTP REST` at `http://nonut:3001/api`
- `WebScocket` at `ws://nonut:3001/:token`

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

Where the paylod depends on the action.

List of avalaible WebSockets actions and respective their payloads:

```ts
type Messages = {
  "sub-game": { // Subscribes the WebSocket to the game with the given id
    id: string
  }
  "game-instance": { // Updated game instance. Only sent from the server
    gameState: string
    status: string
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


## Game Mechanics

### Overview

Tavoitteet, säännöt yms

### Commands


