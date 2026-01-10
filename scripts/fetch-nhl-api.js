/**
 * NHL API Fetcher for Ovechkin Goals (Incremental Mode)
 *
 * Only fetches new goals since the last update, preserving existing data.
 * This prevents data loss from API errors/timeouts.
 *
 * Usage: node scripts/fetch-nhl-api.js [--full]
 *   --full: Force a full refresh (re-fetch all seasons)
 */

import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = join(__dirname, '..', 'data', 'ovechkin_goals_complete.json')
const CACHE_FILE = join(__dirname, '..', 'data', 'nhl_api_cache.json')
const PLAYER_CACHE_FILE = join(__dirname, '..', 'data', 'player_name_cache.json')

const OVI_PLAYER_ID = 8471214
const DELAY_MS = 500 // Delay between game fetches
const PLAYER_LOOKUP_DELAY_MS = 200 // Delay between player lookups
const MAX_RETRIES = 3

// Check for --full flag
const FULL_REFRESH = process.argv.includes('--full')

// Dynamically determine current season (NHL season spans two calendar years)
// If we're in Jan-Aug, current season started last year; if Sep-Dec, it started this year
const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1 // 1-12
const currentSeasonEndYear = currentMonth >= 9 ? currentYear + 1 : currentYear

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Fetch player names for IDs - persisted between runs
let playerCache = {}

function loadPlayerCache() {
  if (existsSync(PLAYER_CACHE_FILE)) {
    try {
      playerCache = JSON.parse(readFileSync(PLAYER_CACHE_FILE, 'utf8'))
      console.log(`Loaded player cache with ${Object.keys(playerCache).length} players`)
    } catch (e) {
      console.log('Could not load player cache, starting fresh')
      playerCache = {}
    }
  }
}

function savePlayerCache() {
  writeFileSync(PLAYER_CACHE_FILE, JSON.stringify(playerCache, null, 2))
}

async function getPlayerName(playerId, retryCount = 0) {
  if (!playerId) return null
  if (playerCache[playerId]) return playerCache[playerId]

  try {
    const res = await fetch(`https://api-web.nhle.com/v1/player/${playerId}/landing`)
    if (res.ok) {
      const data = await res.json()
      const name = `${data.firstName?.default || ''} ${data.lastName?.default || ''}`.trim()
      if (name) {
        playerCache[playerId] = name
        return name
      }
    } else if (res.status === 429 && retryCount < MAX_RETRIES) {
      // Rate limited - wait and retry
      const waitTime = (retryCount + 1) * 2000
      console.log(`  Rate limited on player ${playerId}, waiting ${waitTime}ms...`)
      await delay(waitTime)
      return getPlayerName(playerId, retryCount + 1)
    } else if (res.status >= 500 && retryCount < MAX_RETRIES) {
      // Server error - retry
      await delay(1000)
      return getPlayerName(playerId, retryCount + 1)
    } else {
      console.log(`  Failed to fetch player ${playerId}: HTTP ${res.status}`)
    }
  } catch (e) {
    if (retryCount < MAX_RETRIES) {
      await delay(1000)
      return getPlayerName(playerId, retryCount + 1)
    }
    console.log(`  Error fetching player ${playerId}: ${e.message}`)
  }
  return null
}

async function fetchGameGoals(gameId, retryCount = 0) {
  try {
    const res = await fetch(`https://api-web.nhle.com/v1/gamecenter/${gameId}/play-by-play`)
    if (res.ok) {
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
    } else if (res.status === 429 && retryCount < MAX_RETRIES) {
      const waitTime = (retryCount + 1) * 3000
      console.log(`    Rate limited on game ${gameId}, waiting ${waitTime}ms...`)
      await delay(waitTime)
      return fetchGameGoals(gameId, retryCount + 1)
    } else if (res.status >= 500 && retryCount < MAX_RETRIES) {
      await delay(2000)
      return fetchGameGoals(gameId, retryCount + 1)
    } else {
      console.log(`    Failed to fetch game ${gameId}: HTTP ${res.status}`)
      return []
    }
  } catch (e) {
    if (retryCount < MAX_RETRIES) {
      await delay(2000)
      return fetchGameGoals(gameId, retryCount + 1)
    }
    console.log(`    Error fetching game ${gameId}: ${e.message}`)
    return []
  }
}

async function fetchSeasonGames(seasonId, gameType = 2, retryCount = 0) {
  // gameType: 2 = regular season, 3 = playoffs
  const typeLabel = gameType === 2 ? 'regular' : 'playoffs'
  try {
    const res = await fetch(
      `https://api-web.nhle.com/v1/player/${OVI_PLAYER_ID}/game-log/${seasonId}/${gameType}`
    )
    if (res.ok) {
      const data = await res.json()
      return (data.gameLog || []).map(g => ({
        gameId: g.gameId,
        date: g.gameDate,
        goals: g.goals,
        opponent: g.opponentAbbrev,
      })).filter(g => g.goals > 0) // Only games with goals
    } else if (res.status === 429 && retryCount < MAX_RETRIES) {
      // Rate limited - wait and retry
      const waitTime = (retryCount + 1) * 3000
      console.log(`  Rate limited on ${typeLabel} gamelog, waiting ${waitTime}ms...`)
      await delay(waitTime)
      return fetchSeasonGames(seasonId, gameType, retryCount + 1)
    } else if (res.status >= 500 && retryCount < MAX_RETRIES) {
      // Server error - retry
      console.log(`  Server error ${res.status} on ${typeLabel} gamelog, retrying...`)
      await delay(2000)
      return fetchSeasonGames(seasonId, gameType, retryCount + 1)
    } else {
      console.log(`  WARNING: Failed to fetch ${typeLabel} gamelog: HTTP ${res.status}`)
      return []
    }
  } catch (e) {
    if (retryCount < MAX_RETRIES) {
      console.log(`  Network error on ${typeLabel} gamelog, retrying...`)
      await delay(2000)
      return fetchSeasonGames(seasonId, gameType, retryCount + 1)
    }
    console.log(`  WARNING: Failed to fetch ${typeLabel} gamelog: ${e.message}`)
    return []
  }
}

// Load existing data and find the last goal date
function loadExistingData() {
  if (!existsSync(OUTPUT_FILE)) {
    return { goals: [], lastGoalDate: null }
  }

  try {
    const data = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'))
    const goals = data.goals || []

    if (goals.length === 0) {
      return { goals: [], lastGoalDate: null }
    }

    // Find the most recent goal date
    const sortedByDate = [...goals].sort((a, b) =>
      new Date(b.gameDate) - new Date(a.gameDate)
    )
    const lastGoalDate = sortedByDate[0]?.gameDate

    console.log(`Loaded ${goals.length} existing goals`)
    console.log(`Last goal date: ${lastGoalDate}`)

    return { goals, lastGoalDate }
  } catch (e) {
    console.log(`Could not load existing data: ${e.message}`)
    return { goals: [], lastGoalDate: null }
  }
}

// Create a unique key for deduplication
function goalKey(goal) {
  return `${goal.gameId}_${goal.period}_${goal.time}`
}

async function main() {
  console.log('=== NHL API Ovechkin Goals Fetcher ===')
  console.log(`Mode: ${FULL_REFRESH ? 'FULL REFRESH' : 'INCREMENTAL'}\n`)

  // Load caches
  loadPlayerCache()

  let cache = {}
  if (existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
      console.log(`Loaded game cache with ${Object.keys(cache).length} games`)
    } catch (e) {
      console.log('Starting with empty game cache')
    }
  }

  // Load existing data for incremental mode
  const { goals: existingGoals, lastGoalDate } = FULL_REFRESH
    ? { goals: [], lastGoalDate: null }
    : loadExistingData()

  // Build set of existing goal keys for deduplication
  const existingGoalKeys = new Set(existingGoals.map(goalKey))

  // Determine which seasons to fetch
  let seasonsToFetch = []
  if (FULL_REFRESH || !lastGoalDate) {
    // Full refresh: fetch all seasons
    for (let year = 2006; year <= currentSeasonEndYear; year++) {
      seasonsToFetch.push(year)
    }
    console.log(`\nFetching all ${seasonsToFetch.length} seasons...`)
  } else {
    // Incremental: only fetch current season (and maybe previous if near season boundary)
    const lastGoalYear = new Date(lastGoalDate).getFullYear()
    const lastGoalMonth = new Date(lastGoalDate).getMonth() + 1

    // Determine the season of the last goal
    const lastGoalSeasonEndYear = lastGoalMonth >= 9 ? lastGoalYear + 1 : lastGoalYear

    // Fetch from that season onwards
    for (let year = lastGoalSeasonEndYear; year <= currentSeasonEndYear; year++) {
      seasonsToFetch.push(year)
    }
    console.log(`\nIncremental update: checking ${seasonsToFetch.length} season(s) for games after ${lastGoalDate}`)
  }

  const newGoals = []

  for (const year of seasonsToFetch) {
    const seasonId = parseInt(`${year - 1}${year}`)
    console.log(`\nSeason ${year - 1}-${String(year).slice(2)}:`)

    // Regular season
    const regGames = await fetchSeasonGames(seasonId, 2)

    // Filter to only games after lastGoalDate (for incremental mode)
    const regGamesToFetch = lastGoalDate && !FULL_REFRESH
      ? regGames.filter(g => g.date >= lastGoalDate)
      : regGames

    console.log(`  Regular season: ${regGamesToFetch.length} games to check (${regGames.length} total with goals)`)

    for (const game of regGamesToFetch) {
      const cacheKey = `game_${game.gameId}`

      // For incremental mode on the boundary date, we need to re-fetch to catch same-day goals
      const needsFetch = !cache[cacheKey] || (lastGoalDate && game.date === lastGoalDate)

      if (needsFetch) {
        const goals = await fetchGameGoals(game.gameId)
        if (goals.length > 0) {
          cache[cacheKey] = goals
          // Add only goals we don't already have
          for (const g of goals) {
            const key = goalKey(g)
            if (!existingGoalKeys.has(key)) {
              newGoals.push({ ...g, isPlayoffs: false })
              existingGoalKeys.add(key) // Prevent duplicates within new goals
            }
          }
        }
        await delay(DELAY_MS)
      } else if (cache[cacheKey]) {
        // Use cached data, but still check for duplicates
        for (const g of cache[cacheKey]) {
          const key = goalKey(g)
          if (!existingGoalKeys.has(key)) {
            newGoals.push({ ...g, isPlayoffs: false })
            existingGoalKeys.add(key)
          }
        }
      }
    }

    // Playoffs
    const playoffGames = await fetchSeasonGames(seasonId, 3)
    const playoffGamesToFetch = lastGoalDate && !FULL_REFRESH
      ? playoffGames.filter(g => g.date >= lastGoalDate)
      : playoffGames

    if (playoffGamesToFetch.length > 0) {
      console.log(`  Playoffs: ${playoffGamesToFetch.length} games to check`)

      for (const game of playoffGamesToFetch) {
        const cacheKey = `game_${game.gameId}`

        const needsFetch = !cache[cacheKey] || (lastGoalDate && game.date === lastGoalDate)

        if (needsFetch) {
          const goals = await fetchGameGoals(game.gameId)
          if (goals.length > 0) {
            cache[cacheKey] = goals
            for (const g of goals) {
              const key = goalKey(g)
              if (!existingGoalKeys.has(key)) {
                newGoals.push({ ...g, isPlayoffs: true })
                existingGoalKeys.add(key)
              }
            }
          }
          await delay(DELAY_MS)
        } else if (cache[cacheKey]) {
          for (const g of cache[cacheKey]) {
            const key = goalKey(g)
            if (!existingGoalKeys.has(key)) {
              newGoals.push({ ...g, isPlayoffs: true })
              existingGoalKeys.add(key)
            }
          }
        }
      }
    }

    // Save cache periodically
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
  }

  console.log(`\nFound ${newGoals.length} new goals`)

  // Combine existing and new goals
  const allGoals = [...existingGoals, ...newGoals]

  // Resolve player names for new goals
  if (newGoals.length > 0) {
    console.log('\nResolving player names for new goals...')

    const playerIds = new Set()
    newGoals.forEach(g => {
      if (g.goalieId) playerIds.add(g.goalieId)
      if (g.assist1Id) playerIds.add(g.assist1Id)
      if (g.assist2Id) playerIds.add(g.assist2Id)
    })

    const uncachedIds = [...playerIds].filter(id => !playerCache[id])
    console.log(`  ${playerIds.size} players, ${uncachedIds.length} need lookup`)

    for (const id of uncachedIds) {
      await getPlayerName(id)
      await delay(PLAYER_LOOKUP_DELAY_MS)
    }

    savePlayerCache()
  }

  // Enrich all goals with player names (in case cache was updated)
  const enrichedGoals = allGoals.map(g => ({
    ...g,
    goalieName: playerCache[g.goalieId] || g.goalieName || null,
    primaryAssist: playerCache[g.assist1Id] || g.primaryAssist || null,
    secondaryAssist: playerCache[g.assist2Id] || g.secondaryAssist || null,
  }))

  // Sort and number
  const regularGoals = enrichedGoals.filter(g => !g.isPlayoffs)
    .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate))
  regularGoals.forEach((g, i) => { g.careerGoalNum = i + 1 })

  const playoffGoals = enrichedGoals.filter(g => g.isPlayoffs)
    .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate))
  playoffGoals.forEach((g, i) => { g.playoffGoalNum = i + 1 })

  // Set opponent based on home/away
  regularGoals.forEach(g => {
    g.opponent = g.isHome ? g.awayTeam : g.homeTeam
    g.goalType = g.goalType || 'EV'
  })
  playoffGoals.forEach(g => {
    g.opponent = g.isHome ? g.awayTeam : g.homeTeam
    g.goalType = g.goalType || 'EV'
  })

  // Rebuild stats from all goals
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
  if (newGoals.length > 0) {
    console.log(`New goals added: ${newGoals.length}`)
  }
  console.log(`\nTop 5 Assisters:`)
  stats.topAssisters.slice(0, 5).forEach(([name, count]) => console.log(`  ${name}: ${count}`))
  console.log(`\nTop 5 Goalies Scored On:`)
  stats.topGoalies.slice(0, 5).forEach(([name, count]) => console.log(`  ${name}: ${count}`))
  console.log(`\nSaved to: ${OUTPUT_FILE}`)
}

main().catch(console.error)
