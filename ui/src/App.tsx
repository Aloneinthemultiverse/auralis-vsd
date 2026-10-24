import { useEffect, useState } from 'react'
import { servers as fetchServers, tools as fetchTools, type ServerState, type ToolInfo } from './api'
import { Console } from './Console'
import { DesignFlow } from './DesignFlow'
import { Knowledge } from './Knowledge'
import { Workbench } from './Workbench'

type View = 'flow' | 'bench' | 'knowledge' | 'console'
const VIEWS: [View, string, string][] = [
  ['flow', 'Design flow', 'Spec → research → RTL'],
  ['bench', 'RTL workbench', 'Lint · sim · synth'],
  ['knowledge', 'Knowledge', '2-bit graph RAG'],
  ['console', 'MCP console', 'Every tool'],
]

export default function App() {
  const [view, setView] = useState<View>(() => (localStorage.getItem('vsd.view') as View) || 'flow')
  const [servers, setServers] = useState<ServerState[]>([])
  const [tools, setTools] = useState<ToolInfo[]>([])

  async function refresh() {
    try {
      const [s, t] = await Promise.all([fetchServers(), fetchTools()])
      setServers(s)
      setTools(t)
    } catch {
      setServers([])
    }
  }

  useEffect(() => { refresh(); const t = setInterval(refresh, 30000); return () => clearInterval(t) }, [])
  useEffect(() => { try { localStorage.setItem('vsd.view', view) } catch { /* private mode */ } }, [view])

  return (
    <div className="app">
      <nav>
        <div className="brand"><Chip /> <div><b>Auralis VSD</b><span className="muted">semiconductor design studio</span></div></div>
        {VIEWS.map(([v, label, sub]) => (
          <button key={v} className={`navlink ${view === v ? 'on' : ''}`} onClick={() => setView(v)}>
            {label}<span className="muted">{sub}</span>
          </button>
        ))}
        <div className="servers">
          <h4>MCP servers</h4>
          {servers.length === 0 && <p className="muted">VSD server offline</p>}
          {servers.map(s => (
            <div key={s.name} className="server" title={s.detail}>
              <span className={`dot ${s.connected ? 'good' : 'bad'}`} />
              <div><b>{s.name}</b><span className="muted mono">{s.connected ? `${tools.filter(t => t.server === s.name).length} tools` : s.url}</span></div>
            </div>
          ))}
          <button onClick={refresh}>Reconnect</button>
        </div>
      </nav>
      <main>
        <header><h2>{VIEWS.find(v => v[0] === view)![1]}</h2></header>
        {view === 'flow' && <DesignFlow tools={tools} />}
        {view === 'bench' && <Workbench tools={tools} />}
        {view === 'knowledge' && <Knowledge />}
        {view === 'console' && <Console tools={tools} />}
      </main>
    </div>
  )
}

function Chip() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--chip-bg)" />
      <rect x="9" y="9" width="14" height="14" rx="2" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <path d="M12 9V5M16 9V5M20 9V5M12 27v-4M16 27v-4M20 27v-4M9 12H5M9 16H5M9 20H5M27 12h-4M27 16h-4M27 20h-4"
        stroke="var(--accent)" strokeWidth="1.6" />
    </svg>
  )
}
