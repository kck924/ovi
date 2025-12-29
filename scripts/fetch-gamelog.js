/**
 * Fetch Ovechkin's complete game log (all games, not just goals)
 * This gives us accurate cumulative data over time
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const OVECHKIN_ID = 8471214
const SEASONS = [
  '20052006', '20062007', '20072008', '20082009', '20092010',
  '20102011', '20112012', '20122013', '20132014', '20142015',
  '20152016', '20162017', '20172018', '20182019', '20192020',
  '20202021', '20212022', '20222023', '20232024', '20242025',
  '20252026'
]

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

async function fetchGameLog() {
  const allGames = []
  let cumulativeGoals = 0

  for (const season of SEASONS) {
    console.log(`Fetching season ${season}...`)

    try {
      // NHL API game log endpoint
      const url = `https://api-web.nhle.com/v1/player/${OVECHKIN_ID}/game-log/${season}/2`
      const data = await fetchWithRetry(url)

      if (data.gameLog && data.gameLog.length > 0) {
        // Games come in reverse order (most recent first), so reverse them
        const games = [...data.gameLog].reverse()

        for (const game of games) {
          cumulativeGoals += game.goals || 0
          allGames.push({
            gameId: game.gameId,
            date: game.gameDate,
            season: season,
            opponent: game.opponentAbbrev,
            goals: game.goals || 0,
            assists: game.assists || 0,
            points: game.points || 0,
            cumulativeGoals: cumulativeGoals,
            gameNumber: allGames.length + 1,
          })
        }

        console.log(`  ${games.length} games, cumulative: ${cumulativeGoals} goals`)
      }
    } catch (err) {
      console.log(`  Error fetching ${season}: ${err.message}`)
    }

    // Small delay between seasons
    await new Promise(r => setTimeout(r, 200))
  }

  // Save the data
  const output = {
    player: 'Alex Ovechkin',
    playerId: OVECHKIN_ID,
    totalGames: allGames.length,
    totalGoals: cumulativeGoals,
    games: allGames,
  }

  const outputPath = path.join(__dirname, '..', 'data', 'ovechkin_gamelog.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\nSaved ${allGames.length} games to ${outputPath}`)
  console.log(`Total goals: ${cumulativeGoals}`)
}

fetchGameLog().catch(console.error)
