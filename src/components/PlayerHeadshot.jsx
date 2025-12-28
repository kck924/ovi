/**
 * PlayerHeadshot.jsx
 * Morphing headshot that transitions through 20 images over career progression
 */

import { useMemo } from 'react'

const TOTAL_IMAGES = 20

export default function PlayerHeadshot({ currentGoal = 0, totalGoals = 915 }) {
  // Calculate which image to show (clean transition)
  const currentImage = useMemo(() => {
    const progress = currentGoal / totalGoals
    const imageIdx = Math.min(
      Math.floor(progress * TOTAL_IMAGES),
      TOTAL_IMAGES - 1
    )
    return `/ovi${String(imageIdx + 1).padStart(2, '0')}.png`
  }, [currentGoal, totalGoals])

  return (
    <div className="player-headshot-container">
      <div className="headshot-wrapper">
        <img
          src={currentImage}
          alt="Alex Ovechkin"
          className="headshot-image"
        />
      </div>

      <style>{`
        .player-headshot-container {
          display: flex;
          justify-content: center;
        }

        .headshot-wrapper {
          width: 110px;
          height: 110px;
          border-radius: 6px;
          overflow: hidden;
          mask-image: radial-gradient(
            ellipse 90% 90% at center,
            black 60%,
            transparent 100%
          );
          -webkit-mask-image: radial-gradient(
            ellipse 90% 90% at center,
            black 60%,
            transparent 100%
          );
        }

        .headshot-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
      `}</style>
    </div>
  )
}
