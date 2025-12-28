/**
 * StackingBar.jsx
 * Bar chart made of individual circles - each circle is one goal
 */

import { useMemo } from 'react'

export default function StackingBar({
  data = {},          // { "Name": count, ... } or { "Name": { primary, secondary }, ... }
  title = "",
  maxItems = 8,
  color = "#c8102e",
  secondaryColor = null,  // If set, expects data with { primary, secondary } structure
  dotSize = 4,
  hideHeader = false,
  hideTotal = false,
}) {
  const isAssistMode = secondaryColor !== null

  // Sort and take top N
  const sortedItems = useMemo(() => {
    return Object.entries(data)
      .sort((a, b) => {
        const aTotal = isAssistMode ? (a[1].primary + a[1].secondary) : a[1]
        const bTotal = isAssistMode ? (b[1].primary + b[1].secondary) : b[1]
        return bTotal - aTotal
      })
      .slice(0, maxItems)
  }, [data, maxItems, isAssistMode])

  const total = useMemo(() => {
    return Object.values(data).reduce((acc, val) => {
      if (isAssistMode) {
        return acc + (val.primary || 0) + (val.secondary || 0)
      }
      return acc + val
    }, 0)
  }, [data, isAssistMode])

  const getCount = (value) => {
    if (isAssistMode) {
      return (value.primary || 0) + (value.secondary || 0)
    }
    return value
  }

  return (
    <div className="stacking-bar">
      {!hideHeader && (
        <div className="stacking-bar-header">
          <span className="stacking-bar-title">{title}</span>
          {!hideTotal && <span className="stacking-bar-total">{total}</span>}
        </div>
      )}

      <div className="stacking-bar-items">
        {sortedItems.map(([name, value], i) => {
          const count = getCount(value)
          const primaryCount = isAssistMode ? (value.primary || 0) : count
          const secondaryCount = isAssistMode ? (value.secondary || 0) : 0

          return (
            <div
              key={name}
              className="bar-item"
            >
              <div className="bar-name" title={name}>
                {name.split(' ').slice(-1)[0]}
              </div>
              <div className="bar-dots">
                {/* Primary assists (brighter color) */}
                {Array.from({ length: primaryCount }).map((_, dotIndex) => (
                  <div
                    key={`${name}-p-${dotIndex}`}
                    className="goal-dot"
                    style={{
                      backgroundColor: color,
                      width: dotSize,
                      height: dotSize,
                    }}
                  />
                ))}
                {/* Secondary assists (lighter color) */}
                {Array.from({ length: secondaryCount }).map((_, dotIndex) => (
                  <div
                    key={`${name}-s-${dotIndex}`}
                    className="goal-dot"
                    style={{
                      backgroundColor: secondaryColor || color,
                      width: dotSize,
                      height: dotSize,
                    }}
                  />
                ))}
              </div>
              <div className="bar-count">{count}</div>
            </div>
          )
        })}
      </div>

      <style>{`
        .stacking-bar {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
        }

        .stacking-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #333;
        }

        .stacking-bar-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stacking-bar-total {
          font-size: 1rem;
          font-weight: 700;
          color: ${color};
        }

        .stacking-bar-items {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          overflow: hidden;
        }

        .bar-item {
          display: grid;
          grid-template-columns: 50px 1fr 22px;
          align-items: start;
          gap: 0.3rem;
          min-height: 16px;
          padding: 2px 0;
        }

        .bar-name {
          font-size: 0.6rem;
          color: #aaa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
        }

        .bar-dots {
          display: flex;
          flex-wrap: wrap;
          gap: 1px;
          align-items: flex-start;
          align-content: flex-start;
        }

        .goal-dot {
          border-radius: 50%;
          flex-shrink: 0;
        }

        .bar-count {
          font-size: 0.65rem;
          font-weight: 600;
          color: #fff;
          text-align: right;
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
          .stacking-bar {
            padding: 0.4rem;
          }

          .stacking-bar-header {
            margin-bottom: 0.35rem;
            padding-bottom: 0.35rem;
          }

          .stacking-bar-title {
            font-size: 0.65rem;
          }

          .stacking-bar-total {
            font-size: 0.85rem;
          }

          .stacking-bar-items {
            gap: 0.25rem;
          }

          .bar-item {
            grid-template-columns: 45px 1fr 20px;
            gap: 0.2rem;
            min-height: 14px;
          }

          .bar-name {
            font-size: 0.55rem;
          }

          .bar-count {
            font-size: 0.55rem;
          }
        }
      `}</style>
    </div>
  )
}
