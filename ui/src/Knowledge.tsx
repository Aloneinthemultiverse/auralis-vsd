import { useState } from 'react'
import { call, type Result } from './api'
import { Output } from './Output'

/** Side by side: fused hybrid search and TurboVec-HippoRAG (2-bit fact graph) with the facts it used. */
export function Knowledge() {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [hybrid, setHybrid] = useState<Result | null>(null)
  const [graph, setGraph] = useState<Result | null>(null)
  const [status, setStatus] = useState('')

  async function search() {
    setBusy(true)
    const [h, g] = await Promise.all([
      call('auralis', 'knowledge_search', { query: q, topK: 5 }),
      call('auralis', 'knowledge_hippo_search', { query: q, topK: 5 }),
    ])
    setHybrid(h)
    setGraph(g)
    setBusy(false)
  }

  return (
    <div>
      <div className="row">
        <input className="grow" placeholder="e.g. what checks the boot image before the CVA6 cores start?" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && q.trim() && search()} />
        <button className="primary" disabled={busy || !q.trim()} onClick={search}>{busy ? 'Searching…' : 'Search'}</button>
        <button onClick={async () => setStatus((await call('auralis', 'knowledge_hippo_status', {})).text)}>Index status</button>
      </div>
      {status && <p className="muted mono">{status}</p>}
      <div className="split">
        <section className="card"><h3>knowledge_search · TurboVec + keyword + fact graph, Laya-rated</h3>{hybrid ? <Output result={hybrid} /> : <p className="muted">—</p>}</section>
        <section className="card"><h3>TurboVec-HippoRAG · facts → entities → PageRank</h3>{graph ? <Output result={graph} /> : <p className="muted">—</p>}</section>
      </div>
    </div>
  )
}
