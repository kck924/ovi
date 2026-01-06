import { useState, useEffect } from 'react'
import AnimatedViz from './components/AnimatedViz'

function App() {
  const [goals, setGoals] = useState([])
  const [gamelog, setGamelog] = useState([])
  const [stats, setStats] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      // Load goals data
      const goalFiles = [
        '/data/ovechkin_goals_complete.json',
        '/data/ovechkin_goals.json',
      ]

      for (const file of goalFiles) {
        try {
          const res = await fetch(file)
          if (res.ok) {
            const data = await res.json()
            setGoals(data.goals || [])
            setStats(data.stats || null)
            setMetadata(data.metadata || null)
            console.log(`Loaded ${data.goals?.length} goals from ${file}`)
            break
          }
        } catch (err) {
          console.log(`Could not load ${file}`)
        }
      }

      // Load gamelog data
      try {
        const res = await fetch('/data/ovechkin_gamelog.json')
        if (res.ok) {
          const data = await res.json()
          setGamelog(data.games || [])
          console.log(`Loaded ${data.games?.length} games from gamelog`)
        }
      } catch (err) {
        console.log('Could not load gamelog')
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const regularSeasonGoals = goals.filter(g => !g.isPlayoffs)

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-number">8</div>
          <div className="loading-text">Loading Ovechkin's Goals...</div>
        </div>
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="error-screen">
        <h1>The Great 8</h1>
        <p>No goal data found. Run:</p>
        <pre>npm run collect:nhl</pre>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="player-number">8</div>
          <div className="player-info">
            <div className="player-name">ALEX OVECHKIN</div>
            <div className="player-subtitle">WASHINGTON CAPITALS</div>
          </div>
        </div>

        <img src="/ovihoist.png" alt="" className="mobile-header-image" />

        <div className="mobile-goals-count">
          <span className="mobile-goals-number">{regularSeasonGoals.length}</span>
          <span className="mobile-goals-text">goals and counting</span>
        </div>

        <div className="header-center">
          <img src="/thegoal.png" alt="" className="header-decoration left" />
          <div className="total-goals">{regularSeasonGoals.length}</div>
          <div className="total-label">CAREER GOALS</div>
          <div className="total-sublabel">and counting<span className="loading-dots"></span></div>
          <img src="/ovislide.png" alt="" className="header-decoration right" />
        </div>

        <div className="header-right">
          <a href="https://www.japersrink.com" target="_blank" rel="noopener noreferrer">
            <img src="/jr.webp" alt="Japers' Rink" className="header-jr" />
          </a>
          <div className="header-jr-text">A Japers' Rink joint...</div>
        </div>
      </header>

      <AnimatedViz goals={goals} stats={stats} gamelog={gamelog} />

      <footer className="app-footer">
        <span className="author-credit">
          Data visualization by Kevin Klein
          <a href="https://www.linkedin.com/in/kevinkleinads" target="_blank" rel="noopener noreferrer" className="linkedin-link" title="LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
          </a>
          <a href="mailto:kevin@amyrlin.com" className="email-link" title="Email">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3v18h24v-18h-24zm21.518 2l-9.518 7.713-9.518-7.713h19.036zm-19.518 14v-11.817l10 8.104 10-8.104v11.817h-20z"/>
            </svg>
          </a>
        </span>
        <span className="data-attribution">Data: NHL.com & Moneypuck</span>
        <span className="broadcast-attribution">Video broadcast rights: FSN, Sportsnet, and Monumental Sports & Entertainment</span>
        <a href="https://www.japersrink.com" target="_blank" rel="noopener noreferrer" className="footer-jr">
          <img src="/jr.webp" alt="Japers' Rink" />
          <span>A Japers' Rink joint...</span>
        </a>
      </footer>
    </div>
  )
}

export default App
