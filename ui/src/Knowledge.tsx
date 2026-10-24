import { useState } from 'react'
import { call, type Result } from './api'
import { Output } from './Output'

/** Side by side: fused hybrid search and the 2-bit graph search with its relation paths. */
export function Knowledge() {
  const [q, setQ] = useState('')
  const [hops, setHops] = useState(2)
  const [busy, setBusy] = useState(false)
  const [hybrid, setHybrid] = useState<Result | null>(null)
  const [graph, setGraph] = useState<Result | null>(null)
  const [status, setStatus] = useState('')

  async function search() {
    setBusy(true)
    const [h, g] = await Promise.all([
      call('auralis', 'knowledge_search', { query: q, topK: 5 }),
      call('auralis', 'knowledge_graph_search', { query: q, topK: 5, hops }),
    ])
    setHybrid(h)
    setGraph(g)
    setBusy(false)
  }

  return (
    <div>
      <div className="row">
        <input className="grow" placeholder="e.g. how does the CVA6 cluster reach LPDDR4 memory?" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && q.trim() && search()} />
        <label className="inline">hops <input type="number" min={0} max={3} value={hops} onChange={e => setHops(Number(e.target.value))} /></label>
        <button className="primary" disabled={busy || !q.trim()} onClick={search}>{busy ? 'Searching…' : 'Search'}</button>
        <button onClick={async () => setStatus((await call('auralis', 'knowledge_graph_status', {})).text)}>Graph index</button>
      </div>
      {status && <p className="muted mono">{status}</p>}
      <div className="split">
        <section className="card"><h3>Hybrid · TurboVec + keyword + graph, Laya-rated</h3>{hybrid ? <Output result={hybrid} /> : <p className="muted">—</p>}</section>
        <section className="card"><h3>2-bit graph RAG · relation paths</h3>{graph ? <Output result={graph} /> : <p className="muted">—</p>}</section>
      </div>
    </div>
  )
}
