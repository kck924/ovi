/**
 * GoalCounter.jsx
 * Animated counter for displaying goal milestones
 * Uses Framer Motion for smooth number transitions
 */

import { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

// Animated number component
function AnimatedNumber({ value, duration = 2 }) {
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 30,
    duration: duration * 1000
  })

  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  )

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span>{display}</motion.span>
}

// Milestone celebration effect
function MilestoneBurst({ active }) {
  if (!active) return null

  return (
    <div className="milestone-burst">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="burst-particle"
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0],
            x: Math.cos((i * 30 * Math.PI) / 180) * 100,
            y: Math.sin((i * 30 * Math.PI) / 180) * 100,
            opacity: [1, 1, 0]
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export default function GoalCounter({
  totalGoals = 0,
  playoffGoals = 0,
  animate = true,
  showBreakdown = true,
  milestone = null, // Optional milestone to celebrate
}) {
  const [celebrating, setCelebrating] = useState(false)
  const [displayValue, setDisplayValue] = useState(animate ? 0 : totalGoals)
  const prevGoals = useRef(totalGoals)

  // Trigger celebration when reaching a new milestone
  useEffect(() => {
    if (milestone && totalGoals >= milestone && prevGoals.current < milestone) {
      setCelebrating(true)
      setTimeout(() => setCelebrating(false), 2000)
    }
    prevGoals.current = totalGoals
  }, [totalGoals, milestone])

  // Animate on mount
  useEffect(() => {
    if (animate) {
      setDisplayValue(totalGoals)
    }
  }, [animate, totalGoals])

  const regularSeasonGoals = totalGoals - playoffGoals

  return (
    <div className={`goal-counter ${celebrating ? 'celebrating' : ''}`}>
      <MilestoneBurst active={celebrating} />

      <div className="counter-main">
        <div className="counter-label">Career Goals</div>
        <div className="counter-value">
          {animate ? (
            <AnimatedNumber value={displayValue} duration={2.5} />
          ) : (
            totalGoals.toLocaleString()
          )}
        </div>
      </div>

      {showBreakdown && (
        <div className="counter-breakdown">
          <div className="breakdown-item">
            <span className="breakdown-value">{regularSeasonGoals}</span>
            <span className="breakdown-label">Regular Season</span>
          </div>
          <div className="breakdown-divider" />
          <div className="breakdown-item">
            <span className="breakdown-value">{playoffGoals}</span>
            <span className="breakdown-label">Playoffs</span>
          </div>
        </div>
      )}

      {/* Record comparison */}
      <div className="record-comparison">
        <div className="record-item gretzky">
          <span className="record-name">Gretzky</span>
          <span className="record-value">894</span>
          {totalGoals > 894 && <span className="record-passed">PASSED</span>}
        </div>
        <div className="record-item howe">
          <span className="record-name">Howe</span>
          <span className="record-value">801</span>
          {totalGoals > 801 && <span className="record-passed">PASSED</span>}
        </div>
        <div className="record-item jagr">
          <span className="record-name">Jagr</span>
          <span className="record-value">766</span>
          {totalGoals > 766 && <span className="record-passed">PASSED</span>}
        </div>
      </div>

      <style>{`
        .goal-counter {
          text-align: center;
          padding: 2rem;
          position: relative;
        }

        .goal-counter.celebrating {
          animation: pulse 0.5s ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .milestone-burst {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .burst-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #ffd700;
          border-radius: 50%;
        }

        .counter-main {
          margin-bottom: 1.5rem;
        }

        .counter-label {
          font-size: 1rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }

        .counter-value {
          font-size: 6rem;
          font-weight: 900;
          background: linear-gradient(135deg, #c8102e 0%, #ff6b6b 50%, #c8102e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }

        .counter-breakdown {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .breakdown-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .breakdown-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }

        .breakdown-label {
          font-size: 0.75rem;
          color: #666;
          text-transform: uppercase;
        }

        .breakdown-divider {
          width: 1px;
          height: 40px;
          background: #333;
        }

        .record-comparison {
          display: flex;
          justify-content: center;
          gap: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid #222;
        }

        .record-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .record-name {
          font-size: 0.875rem;
          color: #666;
        }

        .record-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: #888;
        }

        .record-passed {
          position: absolute;
          top: -8px;
          right: -20px;
          font-size: 0.5rem;
          background: #c8102e;
          color: #fff;
          padding: 2px 4px;
          border-radius: 2px;
          transform: rotate(12deg);
        }

        .record-item.gretzky .record-passed {
          background: #ffd700;
          color: #000;
        }
      `}</style>
    </div>
  )
}
