/**
 * ShotMap.jsx
 * Plots all Ovechkin goals on the hockey rink
 */

import { useState, useMemo } from 'react'
import HockeyRink from './HockeyRink'

export default function ShotMap({ goals }) {
  const [hoveredGoal, setHoveredGoal] = useState(null)
  const [filter, setFilter] = useState('all') // all, pp, ev, sh

  // Normalize all goals to one side of the ice (attacking zone)
  // Ovechkin shoots left, so his "Ovi spot" is in the left circle
  const normalizedGoals = useMemo(() => {
    return goals
      .filter(g => g.xCoord != null && g.yCoord != null)
      .filter(g => {
        if (filter === 'all') return true
        return g.goalType?.toLowerCase() === filter
      })
      .map(goal => {
        // Normalize to left side (negative x = attacking zone for left shooter)
        let x = goal.xCoord
        let y = goal.yCoord

        // If goal was on right side, mirror to left
        if (x > 0) {
          x = -x
          y = -y
        }

        return { ...goal, x, y }
      })
  }, [goals, filter])

  const filterCounts = useMemo(() => ({
    all: goals.filter(g => g.xCoord != null).length,
    pp: goals.filter(g => g.xCoord != null && g.goalType?.toLowerCase() === 'pp').length,
    ev: goals.filter(g => g.xCoord != null && g.goalType?.toLowerCase() === 'ev').length,
    sh: goals.filter(g => g.xCoord != null && g.goalType?.toLowerCase() === 'sh').length,
  }), [goals])

  return (
    <div className="shot-map">
      <div className="filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({filterCounts.all})
        </button>
        <button
          className={filter === 'pp' ? 'active' : ''}
          onClick={() => setFilter('pp')}
        >
          Power Play ({filterCounts.pp})
        </button>
        <button
          className={filter === 'ev' ? 'active' : ''}
          onClick={() => setFilter('ev')}
        >
          Even Strength ({filterCounts.ev})
        </button>
        <button
          className={filter === 'sh' ? 'active' : ''}
          onClick={() => setFilter('sh')}
        >
          Shorthanded ({filterCounts.sh})
        </button>
      </div>

      <HockeyRink>
        {({ toSvgX, toSvgY, scale }) => (
          <g className="goal-markers">
            {normalizedGoals.map((goal, i) => (
              <circle
                key={goal.careerGoalNum || i}
                className="goal-marker"
                cx={toSvgX(goal.x)}
                cy={toSvgY(goal.y)}
                r={hoveredGoal === goal ? 6 : 4}
                onMouseEnter={() => setHoveredGoal(goal)}
                onMouseLeave={() => setHoveredGoal(null)}
              />
            ))}
          </g>
        )}
      </HockeyRink>

      {hoveredGoal && (
        <div className="goal-tooltip">
          <div className="goal-number">Goal #{hoveredGoal.careerGoalNum}</div>
          <div className="goal-date">{hoveredGoal.date}</div>
          <div className="goal-opponent">vs {hoveredGoal.opponent}</div>
          {hoveredGoal.goalieName && (
            <div className="goal-goalie">Goalie: {hoveredGoal.goalieName}</div>
          )}
          {hoveredGoal.primaryAssist && (
            <div className="goal-assist">
              Assist: {hoveredGoal.primaryAssist}
              {hoveredGoal.secondaryAssist && `, ${hoveredGoal.secondaryAssist}`}
            </div>
          )}
          <div className="goal-type">{hoveredGoal.goalType} | {hoveredGoal.shotType}</div>
        </div>
      )}

      <style>{`
        .shot-map {
          width: 100%;
          max-width: 900px;
        }

        .filters {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .filters button {
          padding: 0.5rem 1rem;
          background: #1a1a1a;
          border: 1px solid #333;
          color: #888;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .filters button:hover {
          border-color: #c8102e;
          color: #fff;
        }

        .filters button.active {
          background: #c8102e;
          border-color: #c8102e;
          color: #fff;
        }

        .goal-tooltip {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid #c8102e;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          min-width: 200px;
        }

        .goal-number {
          font-size: 1.25rem;
          font-weight: 700;
          color: #c8102e;
        }

        .goal-date {
          color: #888;
          font-size: 0.875rem;
        }

        .goal-opponent {
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .goal-goalie, .goal-assist {
          font-size: 0.875rem;
          color: #aaa;
          margin-top: 0.25rem;
        }

        .goal-type {
          font-size: 0.75rem;
          color: #666;
          margin-top: 0.5rem;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}
