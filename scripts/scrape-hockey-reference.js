/**
 * Hockey Reference Scraper for Ovechkin Goals
 *
 * Scrapes all goals from Ovechkin's scoring logs:
 * https://www.hockey-reference.com/players/o/ovechal01/scoring/{year}
 *
 * Usage: node scripts/scrape-hockey-reference.js
 * Output: data/hockey_reference_goals.json
 */

import puppeteer from 'puppeteer'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = join(__dirname, '..', 'data', 'hockey_reference_goals.json')
const CACHE_FILE = join(__dirname, '..', 'data', 'scrape_cache.json')

// Ovechkin's career seasons (2005-06 through 2024-25)
// Hockey Reference uses end year (2006 for 2005-06 season)
const SEASONS = []
for (let year = 2006; year <= 2025; year++) {
  SEASONS.push(year)
}

// Delay between requests to be respectful
const DELAY_MS = 2500

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Find Chrome on macOS
function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ]
  for (const p of paths) {
    try {
      execSync(`test -f "${p}"`)
      return p
    } catch {
      continue
    }
  }
  return null
}

async function scrapeSeason(browser, year, isPlayoffs = false) {
  const page = await browser.newPage()

  // Set a realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  // Set extra headers to look more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  })

  const seasonType = isPlayoffs ? 'playoffs' : 'scoring'
  const url = `https://www.hockey-reference.com/players/o/ovechal01/${seasonType}/${year}`

  console.log(`Scraping ${isPlayoffs ? 'playoffs' : 'regular season'} ${year - 1}-${String(year).slice(2)}...`)

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

    // Give the page time to fully render
    await delay(1000)

    // Wait for the scoring table
    await page.waitForSelector('#scoring, #scoring_playoffs, .table_wrapper', { timeout: 10000 })
      .catch(() => null)

    // Extract goals from the page
    const goals = await page.evaluate((year, isPlayoffs) => {
      const results = []

      // Try different table selectors
      const table = document.querySelector('#scoring') ||
                    document.querySelector('#scoring_playoffs') ||
                    document.querySelector('.stats_table')

      if (!table) return results

      const rows = table.querySelectorAll('tbody tr:not(.thead)')

      rows.forEach(row => {
        // Skip header rows
        if (row.classList.contains('thead') || row.classList.contains('over_header')) return

        const cells = row.querySelectorAll('td, th')
        if (cells.length < 10) return

        // Check if this row is a goal (look for "Goal" in the description or G column)
        const rowText = row.textContent || ''

        // Get the scoring column - usually has "Goal" or goal details
        const descCell = row.querySelector('td[data-stat="description"]') ||
                         row.querySelector('td:last-child')

        const description = descCell?.textContent?.trim() || ''

        // Only process rows that are goals
        if (!description.toLowerCase().includes('goal') &&
            !rowText.includes(' G ') &&
            !row.querySelector('td[data-stat="goal"]')) {
          return
        }

        // Extract data from cells
        const dateCell = row.querySelector('td[data-stat="date_game"], th[data-stat="date_game"]')
        const oppCell = row.querySelector('td[data-stat="opp_id"]')
        const periodCell = row.querySelector('td[data-stat="period"]')
        const timeCell = row.querySelector('td[data-stat="time_on_ice"]') ||
                         row.querySelector('td[data-stat="time"]')

        const date = dateCell?.textContent?.trim() || ''
        const opponent = oppCell?.textContent?.trim() || ''
        const period = periodCell?.textContent?.trim() || ''
        const time = timeCell?.textContent?.trim() || ''

        // Parse goal type from description
        let goalType = 'EV' // default to even strength
        if (description.includes('power play') || description.includes('PP')) {
          goalType = 'PP'
        } else if (description.includes('short-handed') || description.includes('SH')) {
          goalType = 'SH'
        } else if (description.includes('empty net') || description.includes('EN')) {
          goalType = 'EN'
        }

        // Parse assists from description
        // Format usually: "Goal (assists: Player1, Player2)" or "from Player1 and Player2"
        let primaryAssist = null
        let secondaryAssist = null

        const assistMatch = description.match(/(?:assists?:?\s*|from\s+)([^,]+?)(?:,\s*|\s+and\s+)([^)]+)/i) ||
                           description.match(/(?:assists?:?\s*|from\s+)([^)]+)/i)

        if (assistMatch) {
          primaryAssist = assistMatch[1]?.trim().replace(/^and\s+/i, '') || null
          secondaryAssist = assistMatch[2]?.trim() || null

          // Clean up common patterns
          if (primaryAssist) {
            primaryAssist = primaryAssist.replace(/\s*\(\d+\)\s*$/, '') // Remove (12) assist counts
          }
          if (secondaryAssist) {
            secondaryAssist = secondaryAssist.replace(/\s*\(\d+\)\s*$/, '')
          }
        }

        // Check for unassisted
        if (description.toLowerCase().includes('unassisted')) {
          primaryAssist = null
          secondaryAssist = null
        }

        if (date) {
          results.push({
            date,
            season: `${year - 1}${year}`,
            seasonDisplay: `${year - 1}-${String(year).slice(2)}`,
            opponent,
            period,
            time,
            goalType,
            primaryAssist,
            secondaryAssist,
            isPlayoffs,
            rawDescription: description
          })
        }
      })

      return results
    }, year, isPlayoffs)

    await page.close()
    return goals

  } catch (error) {
    console.error(`Error scraping ${year}: ${error.message}`)
    await page.close()
    return []
  }
}

async function scrapeAllGoals() {
  console.log('Starting Hockey Reference scraper for Ovechkin goals...\n')

  // Load cache if exists
  let cache = {}
  if (existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
      console.log('Loaded cache with', Object.keys(cache).length, 'seasons\n')
    } catch (e) {
      console.log('Could not load cache, starting fresh\n')
    }
  }

  // Try to find local Chrome for better compatibility
  const chromePath = findChrome()

  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
    timeout: 60000,
  }

  if (chromePath) {
    console.log(`Using local Chrome: ${chromePath}\n`)
    launchOptions.executablePath = chromePath
  } else {
    console.log('Using Puppeteer bundled Chromium\n')
  }

  const browser = await puppeteer.launch(launchOptions)

  const allGoals = []
  let careerGoalNum = 0

  try {
    for (const year of SEASONS) {
      const cacheKey = `regular_${year}`
      const playoffCacheKey = `playoffs_${year}`

      // Regular season
      let regularGoals
      if (cache[cacheKey]) {
        console.log(`Using cached data for ${year - 1}-${String(year).slice(2)} regular season`)
        regularGoals = cache[cacheKey]
      } else {
        regularGoals = await scrapeSeason(browser, year, false)
        cache[cacheKey] = regularGoals
        await delay(DELAY_MS)
      }

      // Number the goals
      regularGoals.forEach(goal => {
        careerGoalNum++
        goal.careerGoalNum = careerGoalNum
      })
      allGoals.push(...regularGoals)

      // Playoffs
      let playoffGoals
      if (cache[playoffCacheKey]) {
        console.log(`Using cached data for ${year - 1}-${String(year).slice(2)} playoffs`)
        playoffGoals = cache[playoffCacheKey]
      } else {
        playoffGoals = await scrapeSeason(browser, year, true)
        cache[playoffCacheKey] = playoffGoals
        await delay(DELAY_MS)
      }

      // Playoff goals get separate numbering (added later)
      allGoals.push(...playoffGoals)

      // Save cache after each season
      writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
    }

  } finally {
    await browser.close()
  }

  // Separate regular season and playoff goals
  const regularSeasonGoals = allGoals.filter(g => !g.isPlayoffs)
  const playoffGoals = allGoals.filter(g => g.isPlayoffs)

  // Number playoff goals separately
  playoffGoals.forEach((goal, i) => {
    goal.playoffGoalNum = i + 1
  })

  // Build summary stats
  const stats = {
    bySeason: {},
    byOpponent: {},
    byGoalType: {},
    byAnyAssist: {},
    topAssisters: []
  }

  regularSeasonGoals.forEach(goal => {
    // By season
    stats.bySeason[goal.season] = (stats.bySeason[goal.season] || 0) + 1

    // By opponent
    if (goal.opponent) {
      stats.byOpponent[goal.opponent] = (stats.byOpponent[goal.opponent] || 0) + 1
    }

    // By goal type
    stats.byGoalType[goal.goalType] = (stats.byGoalType[goal.goalType] || 0) + 1

    // By assister
    if (goal.primaryAssist) {
      stats.byAnyAssist[goal.primaryAssist] = (stats.byAnyAssist[goal.primaryAssist] || 0) + 1
    }
    if (goal.secondaryAssist) {
      stats.byAnyAssist[goal.secondaryAssist] = (stats.byAnyAssist[goal.secondaryAssist] || 0) + 1
    }
  })

  // Sort top assisters
  stats.topAssisters = Object.entries(stats.byAnyAssist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  // Build final output
  const output = {
    metadata: {
      player: 'Alex Ovechkin',
      playerId: 8471214,
      scrapedAt: new Date().toISOString(),
      source: 'Hockey Reference',
      regularSeasonGoals: regularSeasonGoals.length,
      playoffGoals: playoffGoals.length
    },
    stats,
    goals: [...regularSeasonGoals, ...playoffGoals]
  }

  // Write output
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

  console.log('\n=== Scraping Complete ===')
  console.log(`Regular season goals: ${regularSeasonGoals.length}`)
  console.log(`Playoff goals: ${playoffGoals.length}`)
  console.log(`Total goals: ${allGoals.length}`)
  console.log(`Output saved to: ${OUTPUT_FILE}`)

  return output
}

// Run the scraper
scrapeAllGoals().catch(console.error)
