/**
 * NHL API Fetcher for Ovechkin Goals
 * Gets complete goal data including assists, goalies, and coordinates
 *
 * Usage: node scripts/fetch-nhl-api.js
 */

import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = join(__dirname, '..', 'data', 'ovechkin_goals_complete.json')
const CACHE_FILE = join(__dirname, '..', 'data', 'nhl_api_cache.json')

const OVI_PLAYER_ID = 8471214
const DELAY_MS = 500 // NHL API is faster, shorter delay

const SEASONS = []
for (let year = 2006; year <= 2026; year++) {
  SEASONS.push(year)
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Fetch player names for IDs
const playerCache = {}

async function getPlayerName(playerId) {
  if (!playerId) return null
  if (playerCache[playerId]) return playerCache[playerId]

  try {
    const res = await fetch(`https://api-web.nhle.com/v1/player/${playerId}/landing`)
    if (res.ok) {
      const data = await res.json()
      const name = `${data.firstName?.default || ''} ${data.lastName?.default || ''}`.trim()
      playerCache[playerId] = name
      return name
    }
  } catch (e) {
    // Ignore errors
  }
  return null
}

async function fetchGameGoals(gameId) {
  try {
    const res = await fetch(`https://api-web.nhle.com/v1/gamecenter/${gameId}/play-by-play`)
    if (!res.ok) return []

    const data = await res.json()
    const goals = []

    for (const play of data.plays || []) {
      if (play.typeDescKey !== 'goal') continue
      if (play.details?.scoringPlayerId !== OVI_PLAYER_ID) continue

      // Skip shootout goals
      if (play.periodDescriptor?.periodType === 'SO') continue

      goals.push({
        gameId,
        gameDate: data.gameDate,
        period: play.periodDescriptor?.number,
        time: play.timeInPeriod,
        xCoord: play.details?.xCoord,
        yCoord: play.details?.yCoord,
        shotType: play.details?.shotType,
        goalieId: play.details?.goalieInNetId,
        assist1Id: play.details?.assist1PlayerId,
        assist2Id: play.details?.assist2PlayerId,
        homeTeam: data.homeTeam?.abbrev,
        awayTeam: data.awayTeam?.abbrev,
        isHome: data.homeTeam?.abbrev === 'WSH',
      })
    }

    return goals
  } catch (e) {
    console.log(`  Error fetching game ${gameId}: ${e.message}`)
    return []
  }
}

async function fetchSeasonGames(seasonId, gameType = 2) {
  // gameType: 2 = regular season, 3 = playoffs
  try {
    const res = await fetch(
      `https://api-web.nhle.com/v1/player/${OVI_PLAYER_ID}/game-log/${seasonId}/${gameType}`
    )
    if (!res.ok) return []

    const data = await res.json()
    return (data.gameLog || []).map(g => ({
      gameId: g.gameId,
      date: g.gameDate,
      goals: g.goals,
      opponent: g.opponentAbbrev,
    })).filter(g => g.goals > 0) // Only games with goals
  } catch (e) {
    return []
  }
}

async function main() {
  console.log('=== NHL API Ovechkin Goals Fetcher ===\n')

  let cache = {}
  if (existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
      console.log(`Loaded cache with ${Object.keys(cache).length} games\n`)
    } catch (e) {
      console.log('Starting fresh\n')
    }
  }

  const allGoals = []

  for (const year of SEASONS) {
    const seasonId = parseInt(`${year - 1}${year}`)
    console.log(`\nSeason ${year - 1}-${String(year).slice(2)}:`)

    // Regular season
    const regGames = await fetchSeasonGames(seasonId, 2)
    console.log(`  Regular season: ${regGames.length} games with goals`)

    for (const game of regGames) {
      const cacheKey = `game_${game.gameId}`

      if (cache[cacheKey]) {
        allGoals.push(...cache[cacheKey].map(g => ({ ...g, isPlayoffs: false })))
      } else {
        const goals = await fetchGameGoals(game.gameId)
        if (goals.length > 0) {
          cache[cacheKey] = goals
          allGoals.push(...goals.map(g => ({ ...g, isPlayoffs: false })))
        }
        await delay(DELAY_MS)
      }
    }

    // Playoffs
    const playoffGames = await fetchSeasonGames(seasonId, 3)
    if (playoffGames.length > 0) {
      console.log(`  Playoffs: ${playoffGames.length} games with goals`)

      for (const game of playoffGames) {
        const cacheKey = `game_${game.gameId}`

        if (cache[cacheKey]) {
          allGoals.push(...cache[cacheKey].map(g => ({ ...g, isPlayoffs: true })))
        } else {
          const goals = await fetchGameGoals(game.gameId)
          if (goals.length > 0) {
            cache[cacheKey] = goals
            allGoals.push(...goals.map(g => ({ ...g, isPlayoffs: true })))
          }
          await delay(DELAY_MS)
        }
      }
    }

    // Save cache periodically
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
  }

  console.log('\n\nResolving player names...')

  // Get unique player IDs for name lookup
  const playerIds = new Set()
  allGoals.forEach(g => {
    if (g.goalieId) playerIds.add(g.goalieId)
    if (g.assist1Id) playerIds.add(g.assist1Id)
    if (g.assist2Id) playerIds.add(g.assist2Id)
  })

  console.log(`  Looking up ${playerIds.size} players...`)

  let lookupCount = 0
  for (const id of playerIds) {
    if (!playerCache[id]) {
      await getPlayerName(id)
      lookupCount++
      if (lookupCount % 50 === 0) {
        console.log(`  ${lookupCount}/${playerIds.size}...`)
      }
      await delay(100)
    }
  }

  // Enrich goals with player names
  const enrichedGoals = allGoals.map(g => ({
    ...g,
    goalieName: playerCache[g.goalieId] || null,
    primaryAssist: playerCache[g.assist1Id] || null,
    secondaryAssist: playerCache[g.assist2Id] || null,
  }))

  // Sort and number
  const regularGoals = enrichedGoals.filter(g => !g.isPlayoffs)
    .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate))
  regularGoals.forEach((g, i) => { g.careerGoalNum = i + 1 })

  const playoffGoals = enrichedGoals.filter(g => g.isPlayoffs)
    .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate))
  playoffGoals.forEach((g, i) => { g.playoffGoalNum = i + 1 })

  // Compute goal type from situation (simplified - would need more context)
  regularGoals.forEach(g => {
    g.opponent = g.isHome ? g.awayTeam : g.homeTeam
    g.goalType = 'EV' // Default - would need situationCode for PP/SH
  })
  playoffGoals.forEach(g => {
    g.opponent = g.isHome ? g.awayTeam : g.homeTeam
    g.goalType = 'EV'
  })

  // Build stats
  const stats = {
    bySeason: {},
    byOpponent: {},
    byGoalie: {},
    byAnyAssist: {},
    byShotType: {},
  }

  regularGoals.forEach(g => {
    const season = g.gameDate?.slice(0, 4)
    if (season) stats.bySeason[season] = (stats.bySeason[season] || 0) + 1
    if (g.opponent) stats.byOpponent[g.opponent] = (stats.byOpponent[g.opponent] || 0) + 1
    if (g.goalieName) stats.byGoalie[g.goalieName] = (stats.byGoalie[g.goalieName] || 0) + 1
    if (g.shotType) stats.byShotType[g.shotType] = (stats.byShotType[g.shotType] || 0) + 1
    if (g.primaryAssist) stats.byAnyAssist[g.primaryAssist] = (stats.byAnyAssist[g.primaryAssist] || 0) + 1
    if (g.secondaryAssist) stats.byAnyAssist[g.secondaryAssist] = (stats.byAnyAssist[g.secondaryAssist] || 0) + 1
  })

  stats.topAssisters = Object.entries(stats.byAnyAssist).sort((a, b) => b[1] - a[1]).slice(0, 20)
  stats.topGoalies = Object.entries(stats.byGoalie).sort((a, b) => b[1] - a[1]).slice(0, 20)
  stats.topOpponents = Object.entries(stats.byOpponent).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const output = {
    metadata: {
      player: 'Alex Ovechkin',
      playerId: OVI_PLAYER_ID,
      fetchedAt: new Date().toISOString(),
      source: 'NHL API',
      regularSeasonGoals: regularGoals.length,
      playoffGoals: playoffGoals.length,
    },
    stats,
    goals: [...regularGoals, ...playoffGoals],
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

  console.log('\n=== Complete ===')
  console.log(`Regular season: ${regularGoals.length} goals`)
  console.log(`Playoffs: ${playoffGoals.length} goals`)
  console.log(`\nTop 5 Assisters:`)
  stats.topAssisters.slice(0, 5).forEach(([name, count]) => console.log(`  ${name}: ${count}`))
  console.log(`\nTop 5 Goalies Scored On:`)
  stats.topGoalies.slice(0, 5).forEach(([name, count]) => console.log(`  ${name}: ${count}`))
  console.log(`\nSaved to: ${OUTPUT_FILE}`)
}

main().catch(console.error)
