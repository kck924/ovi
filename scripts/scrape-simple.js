/**
 * Simple fetch-based scraper for Hockey Reference
 * Scrapes Ovechkin's game logs and extracts goals
 *
 * Usage: node scripts/scrape-simple.js
 */

import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = join(__dirname, '..', 'data', 'hockey_reference_goals.json')
const CACHE_FILE = join(__dirname, '..', 'data', 'scrape_cache.json')

// Seasons: 2006 = 2005-06 season
const SEASONS = []
for (let year = 2006; year <= 2025; year++) {
  SEASONS.push(year)
}

const DELAY_MS = 3000

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseGameLog(html, year, isPlayoffs) {
  const goals = []
  const seasonStr = `${year - 1}${year}`
  const seasonDisplay = `${year - 1}-${String(year).slice(2)}`

  // Match each gamelog row: <tr id="gamelog.XXXX" or playoffs_gamelog.XXXX>
  const tableId = isPlayoffs ? 'gamelog_playoffs' : 'gamelog'
  const rowRegex = new RegExp(`<tr[^>]*id="${tableId}\\.(\\d+)"[^>]*>([\\s\\S]*?)<\\/tr>`, 'gi')

  let match
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[2]

    // Extract date
    const dateMatch = rowHtml.match(/data-stat="date"[^>]*>(?:<a[^>]*>)?(\d{4}-\d{2}-\d{2})/i)
    const date = dateMatch ? dateMatch[1] : null
    if (!date) continue

    // Extract opponent
    const oppMatch = rowHtml.match(/data-stat="opp_name_abbr"[^>]*>(?:<a[^>]*>)?([A-Z]{3})/i)
    const opponent = oppMatch ? oppMatch[1] : ''

    // Extract goal counts from game
    const goalsMatch = rowHtml.match(/data-stat="goals"[^>]*>(\d+)/i)
    const evGoalsMatch = rowHtml.match(/data-stat="goals_ev"[^>]*>(\d+)/i)
    const ppGoalsMatch = rowHtml.match(/data-stat="goals_pp"[^>]*>(\d+)/i)
    const shGoalsMatch = rowHtml.match(/data-stat="goals_sh"[^>]*>(\d+)/i)

    const totalGoals = goalsMatch ? parseInt(goalsMatch[1]) : 0
    const evGoals = evGoalsMatch ? parseInt(evGoalsMatch[1]) : 0
    const ppGoals = ppGoalsMatch ? parseInt(ppGoalsMatch[1]) : 0
    const shGoals = shGoalsMatch ? parseInt(shGoalsMatch[1]) : 0

    // Create individual goal entries for each goal in this game
    // EV goals first, then PP, then SH
    for (let i = 0; i < evGoals; i++) {
      goals.push({
        date,
        season: seasonStr,
        seasonDisplay,
        opponent,
        goalType: 'EV',
        isPlayoffs,
      })
    }

    for (let i = 0; i < ppGoals; i++) {
      goals.push({
        date,
        season: seasonStr,
        seasonDisplay,
        opponent,
        goalType: 'PP',
        isPlayoffs,
      })
    }

    for (let i = 0; i < shGoals; i++) {
      goals.push({
        date,
        season: seasonStr,
        seasonDisplay,
        opponent,
        goalType: 'SH',
        isPlayoffs,
      })
    }
  }

  return goals
}

async function fetchSeason(year, isPlayoffs = false) {
  const url = `https://www.hockey-reference.com/players/o/ovechal01/gamelog/${year}`

  console.log(`Fetching ${isPlayoffs ? 'playoffs' : 'regular season'} ${year - 1}-${String(year).slice(2)}...`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    if (!response.ok) {
      console.log(`  HTTP ${response.status}`)
      return []
    }

    const html = await response.text()
    const goals = parseGameLog(html, year, isPlayoffs)
    console.log(`  Found ${goals.length} goals`)

    return goals
  } catch (error) {
    console.log(`  Error: ${error.message}`)
    return []
  }
}

async function scrapeAll() {
  console.log('=== Hockey Reference Scraper ===\n')
  console.log('Scraping Ovechkin game logs...\n')

  let cache = {}
  if (existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
      console.log(`Loaded cache with ${Object.keys(cache).length} entries\n`)
    } catch (e) {
      console.log('Starting fresh\n')
    }
  }

  const allGoals = []

  for (const year of SEASONS) {
    const cacheKey = `gamelog_${year}`

    let seasonGoals
    if (cache[cacheKey]?.length > 0) {
      console.log(`Using cache for ${year - 1}-${String(year).slice(2)} (${cache[cacheKey].length} goals)`)
      seasonGoals = cache[cacheKey]
    } else {
      // The gamelog page contains both regular season and playoffs
      seasonGoals = await fetchSeason(year, false)

      // Also check for playoff goals in same response (different table ID)
      const playoffGoals = seasonGoals.filter(g => g.isPlayoffs)
      const regGoals = seasonGoals.filter(g => !g.isPlayoffs)

      if (seasonGoals.length > 0) {
        cache[cacheKey] = seasonGoals
        writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
      }

      await delay(DELAY_MS)
    }

    allGoals.push(...seasonGoals)
  }

  // Number the goals
  const regularSeasonGoals = allGoals.filter(g => !g.isPlayoffs)
  const playoffGoals = allGoals.filter(g => g.isPlayoffs)

  // Sort by date and number
  regularSeasonGoals.sort((a, b) => new Date(a.date) - new Date(b.date))
  regularSeasonGoals.forEach((g, i) => { g.careerGoalNum = i + 1 })

  playoffGoals.sort((a, b) => new Date(a.date) - new Date(b.date))
  playoffGoals.forEach((g, i) => { g.playoffGoalNum = i + 1 })

  // Build stats
  const stats = {
    bySeason: {},
    byOpponent: {},
    byGoalType: {},
  }

  regularSeasonGoals.forEach(g => {
    stats.bySeason[g.season] = (stats.bySeason[g.season] || 0) + 1
    if (g.opponent) stats.byOpponent[g.opponent] = (stats.byOpponent[g.opponent] || 0) + 1
    stats.byGoalType[g.goalType] = (stats.byGoalType[g.goalType] || 0) + 1
  })

  stats.topOpponents = Object.entries(stats.byOpponent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  const output = {
    metadata: {
      player: 'Alex Ovechkin',
      playerId: 8471214,
      scrapedAt: new Date().toISOString(),
      source: 'Hockey Reference',
      regularSeasonGoals: regularSeasonGoals.length,
      playoffGoals: playoffGoals.length,
      note: 'Assist data requires individual boxscore scraping - use MoneyPuck for complete data'
    },
    stats,
    goals: [...regularSeasonGoals, ...playoffGoals]
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

  console.log('\n=== Complete ===')
  console.log(`Regular season: ${regularSeasonGoals.length} goals`)
  console.log(`Playoffs: ${playoffGoals.length} goals`)
  console.log(`\nBy type: EV=${stats.byGoalType.EV || 0}, PP=${stats.byGoalType.PP || 0}, SH=${stats.byGoalType.SH || 0}`)
  console.log(`\nSaved to: ${OUTPUT_FILE}`)
}

scrapeAll().catch(console.error)
