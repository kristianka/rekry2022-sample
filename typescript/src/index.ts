import fetch from 'node-fetch'
import 'dotenv/config'
import open from 'open'
import WebSocket from 'ws'
import { GameInstance, Message, NoPlaneState } from './types'
import { normalizeHeading } from './utils/math'
import { message } from './utils/message'

const frontend_base = 'nonut'
const backend_base = 'nonut:3001'

// Change this to your own implementation
const generateCommands = (gameState: NoPlaneState) => {
  const { aircrafts } = gameState
  const commands = []

  for (const { id, direction } of aircrafts) {
    commands.push(`HEAD ${id} ${normalizeHeading(direction + 20)}`) // Go loopy loop
  }

  return commands
}

const createGame = async (levelId: string, token: string) => {
  const res = await fetch(`http://${backend_base}/api/levels/${levelId}`, {
    method: 'POST',
    headers: {
      Authorization: token,
    },
  })

  if (res.status !== 200) {
    console.error(`Couldn't create game: ${res.statusText} - ${await res.text()}`)
    return null
  }

  return res.json() as any as GameInstance // Can be made safer
}

const main = async () => {
  const token = process.env['TOKEN'] ?? ''
  const levelId = process.env['LEVEL_ID'] ?? ''

  const game = await createGame(levelId, token)
  if (!game) return

  console.log(`Game at http://${frontend_base}/games/${game.entityId}`)
  await open(`http://${frontend_base}/games/${game.entityId}`)
  await new Promise((f) => setTimeout(f, 2000))

  const ws = new WebSocket(`ws://${backend_base}/${token}/`)

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
}

await main()
