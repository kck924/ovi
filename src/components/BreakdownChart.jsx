/**
 * BreakdownChart.jsx
 * Bar charts showing goals by goalie, team, and assister
 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = [
  { id: 'assisters', label: 'Top Assisters' },
  { id: 'goalies', label: 'Goalies Scored On' },
  { id: 'opponents', label: 'Teams Scored Against' },
  { id: 'shotTypes', label: 'Shot Types' },
]

function BarChart({ data, maxValue, color = '#c8102e', showCount = 10 }) {
  const displayData = data.slice(0, showCount)
  const max = maxValue || Math.max(...displayData.map(d => d.value))

  return (
    <div className="bar-chart">
      {displayData.map((item, i) => (
        <motion.div
          key={item.name}
          className="bar-row"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="bar-label" title={item.name}>
            <span className="bar-rank">{i + 1}</span>
            <span className="bar-name">{item.name}</span>
          </div>
          <div className="bar-track">
            <motion.div
              className="bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="bar-value">{item.value}</div>
        </motion.div>
      ))}
    </div>
  )
}

export default function BreakdownChart({ goals, stats }) {
  const [activeTab, setActiveTab] = useState('assisters')

  // Process data for each breakdown type
  const chartData = useMemo(() => {
    if (!goals || goals.length === 0) {
      return { assisters: [], goalies: [], opponents: [], shotTypes: [] }
    }

    // Use pre-computed stats if available
    if (stats) {
      return {
        assisters: (stats.topAssisters || []).map(([name, value]) => ({ name, value })),
        goalies: (stats.topGoalies || []).map(([name, value]) => ({ name, value })),
        opponents: (stats.topOpponents || []).map(([name, value]) => ({ name, value })),
        shotTypes: Object.entries(stats.byShotType || {})
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      }
    }

    // Compute from goals if stats not provided
    const regularGoals = goals.filter(g => !g.isPlayoffs)

    // Assisters
    const assistCounts = {}
    regularGoals.forEach(g => {
      if (g.primaryAssist) {
        assistCounts[g.primaryAssist] = (assistCounts[g.primaryAssist] || 0) + 1
      }
      if (g.secondaryAssist) {
        assistCounts[g.secondaryAssist] = (assistCounts[g.secondaryAssist] || 0) + 1
      }
    })

    // Goalies
    const goalieCounts = {}
    regularGoals.forEach(g => {
      if (g.goalieName) {
        goalieCounts[g.goalieName] = (goalieCounts[g.goalieName] || 0) + 1
      }
    })

    // Opponents
    const opponentCounts = {}
    regularGoals.forEach(g => {
      if (g.opponent) {
        opponentCounts[g.opponent] = (opponentCounts[g.opponent] || 0) + 1
      }
    })

    // Shot types
    const shotTypeCounts = {}
    regularGoals.forEach(g => {
      if (g.shotType) {
        shotTypeCounts[g.shotType] = (shotTypeCounts[g.shotType] || 0) + 1
      }
    })

    const sortByValue = obj =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    return {
      assisters: sortByValue(assistCounts),
      goalies: sortByValue(goalieCounts),
      opponents: sortByValue(opponentCounts),
      shotTypes: sortByValue(shotTypeCounts),
    }
  }, [goals, stats])

  const activeData = chartData[activeTab] || []

  // Special colors for different tabs
  const tabColors = {
    assisters: '#4CAF50',
    goalies: '#c8102e',
    opponents: '#2196F3',
    shotTypes: '#FF9800',
  }

  return (
    <div className="breakdown-chart">
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="chart-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeData.length > 0 ? (
              <BarChart
                data={activeData}
                color={tabColors[activeTab]}
                showCount={activeTab === 'shotTypes' ? 8 : 10}
              />
            ) : (
              <div className="no-data">No data available</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Highlight callouts */}
      {activeTab === 'assisters' && activeData[0] && (
        <div className="callout">
          <span className="callout-name">{activeData[0].name}</span>
          <span className="callout-text">
            has assisted on <strong>{activeData[0].value}</strong> Ovechkin goals
          </span>
        </div>
      )}

      {activeTab === 'goalies' && activeData[0] && (
        <div className="callout">
          <span className="callout-name">{activeData[0].name}</span>
          <span className="callout-text">
            has allowed the most Ovechkin goals: <strong>{activeData[0].value}</strong>
          </span>
        </div>
      )}

      <style>{`
        .breakdown-chart {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .tab {
          padding: 0.5rem 1rem;
          background: #1a1a1a;
          border: 1px solid #333;
          color: #888;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .tab:hover {
          border-color: #555;
          color: #fff;
        }

        .tab.active {
          background: #c8102e;
          border-color: #c8102e;
          color: #fff;
        }

        .chart-content {
          min-height: 400px;
        }

        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .bar-row {
          display: grid;
          grid-template-columns: 180px 1fr 50px;
          align-items: center;
          gap: 1rem;
        }

        .bar-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow: hidden;
        }

        .bar-rank {
          font-size: 0.75rem;
          color: #666;
          width: 20px;
          flex-shrink: 0;
        }

        .bar-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.875rem;
          color: #ccc;
        }

        .bar-track {
          height: 24px;
          background: #1a1a1a;
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 4px;
          min-width: 4px;
        }

        .bar-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: #fff;
          text-align: right;
        }

        .callout {
          margin-top: 1.5rem;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(200, 16, 46, 0.1), rgba(200, 16, 46, 0.05));
          border-left: 3px solid #c8102e;
          border-radius: 0 4px 4px 0;
        }

        .callout-name {
          font-weight: 600;
          color: #fff;
        }

        .callout-text {
          color: #888;
          margin-left: 0.25rem;
        }

        .callout-text strong {
          color: #c8102e;
        }

        .no-data {
          text-align: center;
          color: #666;
          padding: 4rem 0;
        }
      `}</style>
    </div>
  )
}
