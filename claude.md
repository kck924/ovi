# Ovechkin Goals Visualization Project

## Project Overview

An interactive, animated data visualization web experience showcasing every Alex Ovechkin NHL goal (900+). The visualization tells the story of his journey to breaking Wayne Gretzky's all-time goals record (894).

**Tech Stack:** JavaScript, React, D3.js, Scrollama (scrollytelling)

**Key Features:**
- Every goal as a discrete animated event
- Shot location heat map on hockey rink
- Goalies scored against (frequency)
- Teams scored against (frequency)  
- Assist partnerships (who set up his goals)
- Goal accumulation over time (timeline)
- Milestone callouts (100, 500, 800, 894, 895, 900)

---

## Data Requirements

Each goal needs these fields:

| Field | Source | Status |
|-------|--------|--------|
| `date` | Hockey Reference | ✅ |
| `season` | Hockey Reference | ✅ |
| `opponent` | Hockey Reference | ✅ |
| `period` | Hockey Reference | ✅ |
| `time` | Hockey Reference | ✅ |
| `goalType` (PP/EV/SH/EN) | Hockey Reference | ✅ |
| `primaryAssist` | Hockey Reference | ✅ |
| `secondaryAssist` | Hockey Reference | ✅ |
| `xCoord` | MoneyPuck | ✅ (2007+) |
| `yCoord` | MoneyPuck | ✅ (2007+) |
| `goalieName` | MoneyPuck | ✅ |
| `shotType` | MoneyPuck | ✅ |

---

## Data Collection Scripts

### 1. Hockey Reference Scraper
**File:** `scrape-hockey-reference.js`
**Purpose:** Gets assists, goal types, dates from scoring logs
**Output:** `hockey_reference_goals.json`

```bash
npm install puppeteer
node scrape-hockey-reference.js
```

Scrapes: `hockey-reference.com/players/o/ovechal01/scoring/{year}`
- Years 2006-2025 (2005-06 through 2024-25 seasons)
- Both regular season and playoffs
- Uses Puppeteer to bypass bot protection

### 2. MoneyPuck Data
**Purpose:** Shot coordinates (x,y), goalie names, shot types
**Output:** `shots_all.csv` (manual download)

Download from:
- **Kaggle (easiest):** https://www.kaggle.com/datasets/mexwell/nhl-database
- **Direct:** https://moneypuck.com/data.htm → "Shots" section

Filter for: `shooterPlayerId = 8471214` and `event = GOAL`

### 3. Merge Script
**File:** `merge_goal_data.py`
**Purpose:** Combines Hockey Reference + MoneyPuck
**Output:** `ovechkin_goals_complete.json`

```bash
python merge_goal_data.py --hr hockey_reference_goals.json --mp shots_all.csv
```

Matching logic: date + period + time

### 4. NHL API Collector (Alternative)
**File:** `collect_ovechkin_goals.py`
**Purpose:** Direct NHL API access for assists/goalies
**Note:** Slower than Hockey Reference scraper, but doesn't require Puppeteer

---

## NHL Coordinate System

```
   ┌─────────────────────────────────────────────────┐
   │                      │                          │
   │    ○ Left Circle     │      Right Circle ○      │
   │   ("OVI SPOT")       │                          │
   │         ┌───┐   ┌────┼────┐   ┌───┐             │
   │         │ G │   │  ○ │ ○  │   │ G │             │
   │         └───┘   └────┼────┘   └───┘             │
   │   (-89,0)            │(0,0)          (89,0)     │
   │                      │                          │
   └─────────────────────────────────────────────────┘

   x: -100 (left boards) to 100 (right boards)
   y: -42.5 (bottom boards) to 42.5 (top boards)
   Goals at: (-89, 0) and (89, 0)
```

**"Ovi Spot"** (left faceoff circle): x ∈ [-75, -60], y ∈ [15, 30]

---

## Output Data Structure

```json
{
  "metadata": {
    "player": "Alex Ovechkin",
    "playerId": 8471214,
    "regularSeasonGoals": 911,
    "playoffGoals": 72
  },
  "stats": {
    "bySeason": { "20052006": 52, ... },
    "byOpponent": { "TBL": 42, ... },
    "byGoalie": { "Marc-Andre Fleury": 25, ... },
    "byAnyAssist": { "Nicklas Backstrom": 275, ... },
    "byGoalType": { "PP": 312, "EV": 507, ... },
    "topAssisters": [["Nicklas Backstrom", 275], ...],
    "topGoalies": [["Marc-Andre Fleury", 25], ...]
  },
  "goals": [
    {
      "careerGoalNum": 1,
      "date": "2005-10-05",
      "opponent": "CBJ",
      "period": "1",
      "time": "12:34",
      "goalType": "EV",
      "primaryAssist": "Dainius Zubrus",
      "secondaryAssist": "Chris Clark",
      "xCoord": -68.5,
      "yCoord": 21.3,
      "goalieName": "Marc Denis",
      "shotType": "Wrist"
    }
  ]
}
```

---

## Visualization Architecture

```
src/
├── components/
│   ├── HockeyRink.jsx       # SVG rink with zones
│   ├── GoalMarker.jsx       # Individual goal dot
│   ├── ShotMap.jsx          # Rink with all goals plotted
│   ├── Timeline.jsx         # Season-by-season accumulation
│   ├── GoalCounter.jsx      # Animated milestone counter
│   ├── BreakdownChart.jsx   # Bar charts (goalie/team/assist)
│   └── Filters.jsx          # Season, type, opponent filters
├── hooks/
│   ├── useGoalData.js       # Data loading/filtering
│   ├── useAnimation.js      # Animation state
│   └── useScrollytelling.js # Scroll-triggered animations
└── utils/
    ├── scales.js            # D3 scale functions
    └── coordinates.js       # NHL coord transformations
```

**Key Libraries:**
- D3.js - scales, axes, force simulations
- Scrollama - scroll-triggered story beats
- Framer Motion - React animations
- Crossfilter2 - multi-dimensional filtering

---

## Scrollytelling Story Beats

1. **Intro** - Career total counter animating up
2. **First Goal** - Oct 5, 2005 vs Columbus
3. **Rookie Season** - 52 goals (3rd most ever by rookie)
4. **65-Goal Season** - 2007-08 career high
5. **The Ovi Spot** - Heat map showing left circle dominance
6. **Backstrom Connection** - Assist partnership visualization
7. **500 Goals** - Milestone moment
8. **Passing Howe** - 802 goals (Dec 2022)
9. **Breaking Gretzky** - 895 goals (THE moment)
10. **Where He Stands** - 911+ and counting

---

## Key Stats to Highlight

- **Nicklas Backstrom**: ~275 assists on Ovechkin goals (most by far)
- **Marc-Andre Fleury**: ~25 goals allowed (most victimized goalie)
- **Power Play Goals**: 300+ (most in NHL history)
- **"Ovi Spot" Goals**: 200+ from left faceoff circle
- **50-Goal Seasons**: 9 (tied with Gretzky/Bossy)

---

## File Inventory

| File | Purpose |
|------|---------|
| `scrape-hockey-reference.js` | Puppeteer scraper for HR scoring logs |
| `collect_ovechkin_goals.py` | NHL API data collector |
| `merge_goal_data.py` | Combines HR + MoneyPuck data |
| `src/OvechkinShotMap.jsx` | React shot map component |
| `package.json` | Project dependencies and scripts |
| `README.md` | Setup and usage instructions |

---

## npm Scripts

```bash
npm run collect:hr    # Scrape Hockey Reference
npm run collect:nhl   # Collect from NHL API (Node)
npm run collect:python # Collect from NHL API (Python)
npm run merge         # Merge HR + MoneyPuck data
npm run dev           # Start Vite dev server
npm run build         # Production build
```

---

## Current Status

- [x] Data collection scripts created
- [x] Hockey Reference scraper (Puppeteer)
- [x] MoneyPuck data integration
- [x] Data merge logic
- [x] Basic React shot map component
- [ ] Data collection execution (requires local run)
- [ ] Scrollytelling implementation
- [ ] Timeline animation
- [ ] Breakdown charts
- [ ] Mobile responsiveness