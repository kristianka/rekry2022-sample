import axios from 'axios'
import 'dotenv/config'
import open from 'open'
import WebSocket from 'ws'
import { GameInstance, Message, NoPlaneState } from './types'
import { normalizeHeading } from './utils/math'
import { message } from './utils/message'

const token = process.env['TOKEN'] ?? ''
const levelId = process.env['LEVEL_ID'] ?? ''

const { data: game } = await axios.post<GameInstance>(`http://nonut:3001/api/levels/${levelId}`, null, {
  headers: { Authorization: token },
})

console.log(`Game at http://nonut/games/${game.entityId}`)
await open(`http://nonut/games/${game.entityId}`)

const ws = new WebSocket(`ws://nonut:3001/${token}/`)

ws.addEventListener('open', () => {
  ws.send(message('sub-game', { id: game.entityId }))
})

ws.addEventListener('message', ({ data }) => {
  const [action, payload] = JSON.parse(data.toString()) as Message<'game-instance'>

  if (action !== 'game-instance') {
    console.log([action, payload])
    return
  }

  // New game tick arrived!
  const gameState = JSON.parse(payload['gameState']) as NoPlaneState
  const commands = generateCommands(gameState)

  setTimeout(() => {
    ws.send(message('run-command', { gameId: game.entityId, payload: commands }))
  }, 250) // Renders smoother if we wait a bit
})

// CLIENT LOGIC
export const generateCommands = (gameState: NoPlaneState) => {
  const { aircrafts } = gameState
  const commands = []

  for (const { id, direction } of aircrafts) {
    commands.push(`HEAD ${id} ${normalizeHeading(direction + 20)}`) // Go loopy loop
  }

  return commands
}
