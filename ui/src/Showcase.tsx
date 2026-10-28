import { useEffect, useMemo, useState } from 'react'
import { call, type Result } from './api'
import { CodeView } from './CodeView'
import { Markdown } from './markdown'
import { Output } from './Output'

/** One verified block, parsed from a README table whose header has a "Laya" column. */
interface Block { name: string; file: string; what: string; checks: string; verdict: string }

type Tab = 'story' | 'blocks' | 'rtl' | 'docs'

/**
 * Showcase: a finished design from the semiconductor server's library — how it was
 * generated, what every block does and how it was verified, the RTL itself, and a
 * live re-run of lint and simulation on any block.
 */
export function Showcase() {
  const [designs, setDesigns] = useState<[string, string][]>([])
  const [design, setDesign] = useState('edge_ai_soc')
  const [readme, setReadme] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [tab, setTab] = useState<Tab>('story')
  const [error, setError] = useState('')

  useEffect(() => {
    call('semiconductor', 'design_list').then(r => {
      const rows = r.text.split('\n').filter(Boolean).map(l => l.split('\t') as [string, string])
      setDesigns(rows)
      if (rows.length && !rows.some(d => d[0] === design)) setDesign(rows[0][0])
    })
  }, [])

  useEffect(() => {
    setError('')
    call('semiconductor', 'design_read', { design, path: 'README.md' }).then(r => {
      if (r.error || r.text.startsWith('Unknown') || r.text.startsWith('Not a')) setError(r.text)
      setReadme(r.text)
    })
    call('semiconductor', 'design_files', { design }).then(r =>
      setFiles(r.text.split('\n').filter(Boolean).map(l => l.split('\t')[0])))
  }, [design])

  const blocks = useMemo(() => parseBlocks(readme), [readme])
  const title = readme.split('\n').find(l => l.startsWith('# '))?.slice(2) ?? design
  const spec = readme.split('\n').find(l => l.startsWith('Spec:'))?.slice(5).trim() ?? ''

  return (
    <div className="showcase">
      <div className="sc-head">
        <div>
          <div className="eyebrow">Design library · {design}</div>
          <h2 className="sc-title">{title}</h2>
          {spec && <p className="sc-spec">{spec}</p>}
        </div>
        {designs.length > 1 && (
          <label className="inline">Design
            <select value={design} onChange={e => setDesign(e.target.value)}>
              {designs.map(([d]) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        )}
      </div>
      {error && <p className="bad-text">{error}</p>}
      <div className="tabs" role="tablist">
        {([['story', 'How it was generated'], ['blocks', `Blocks · ${blocks.length}`], ['rtl', 'RTL & live verify'], ['docs', 'Design docs']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>
      {tab === 'story' && <Story blocks={blocks} design={design} />}
      {tab === 'blocks' && <Blocks blocks={blocks} />}
      {tab === 'rtl' && <Rtl design={design} files={files} />}
      {tab === 'docs' && <Docs design={design} files={files} />}
    </div>
  )
}

function parseBlocks(md: string): Block[] {
  const out: Block[] = []
  const lines = md.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('|') || !/Laya/.test(lines[i])) continue
    const head = cells(lines[i]).map(h => h.toLowerCase())
    const col = (re: RegExp) => head.findIndex(h => re.test(h))
    const [cName, cFile, cWhat, cChecks, cLaya] = [col(/block/), col(/file/), col(/what|does/), col(/check|result/), col(/laya/)]
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      const c = cells(lines[j])
      out.push({
        name: strip(c[cName] ?? ''), file: strip(c[cFile] ?? ''), what: strip(cWhat >= 0 ? c[cWhat] : ''),
        checks: strip(c[cChecks] ?? ''), verdict: strip(c[cLaya] ?? ''),
      })
    }
  }
  return out
}

const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim())
const strip = (s: string) => s.replace(/\*\*|`/g, '')

function totalChecks(blocks: Block[]) {
  let n = 0
  for (const b of blocks) for (const m of b.checks.matchAll(/(\d[\d,]*)\s*\/\s*\d[\d,]*/g)) n += Number(m[1].replace(/,/g, ''))
  return n
}

function Story({ blocks, design }: { blocks: Block[]; design: string }) {
  const passes = blocks.filter(b => /PASS/.test(b.verdict)).length
  const fixLoop = blocks.find(b => /FIX/.test(b.verdict))
  const steps: [string, string, string][] = [
    ['Specification', 'The goal in plain numbers', 'Throughput, memory, interfaces, power, area and safety targets, written as one problem statement.'],
    ['Evidence', 'Retrieved, not invented', 'For every block Auralis searched its knowledge base (TurboVec 2-bit + keyword + Laya re-rank) and Laya judged whether the evidence was sufficient before any RTL was written.'],
    ['RTL generation', `${blocks.length} blocks, one at a time`, 'The model wrote synthesizable SystemVerilog for each block plus a self-checking testbench that prints PASS or FAIL for every check.'],
    ['Verification', `${totalChecks(blocks).toLocaleString()} checks passed`, 'Every version went through Verilator lint, Icarus simulation and Yosys synthesis on the semiconductor server.'],
    ['Decision loop', `${passes} of ${blocks.length} blocks PASS`, fixLoop ? `Laya decides PASS or FIX for each version. ${fixLoop.name}: ${fixLoop.verdict}.` : 'Laya decides PASS or FIX for each version; FIX sends the block back to be rewritten.'],
    ['Integration', 'Full chip boots and runs', 'Blocks were connected into the SoC and tested end to end: secure boot, four RISC-V cores running firmware, LPDDR4, DMA and atomics.'],
    ['Records', 'Every step is traceable', 'Each block has a design record in the knowledge base, every verdict is in the decision ledger, and the handoff package documents clocks, resets, memories and constraints.'],
  ]
  return (
    <div className="story">
      {design === 'edge_ai_soc' && <SocDiagram />}
      <ol className="timeline">
        {steps.map(([t, k, d], i) => (
          <li key={t} style={{ animationDelay: `${i * 70}ms` }}>
            <span className="t-dot" aria-hidden="true" />
            <div><div className="t-key">{k}</div><h4>{t}</h4><p>{d}</p></div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blockgrid">
      {blocks.map(b => {
        const pass = /PASS/.test(b.verdict)
        return (
          <article key={b.name + b.file} className="blockcard">
            <header><h4>{b.name}</h4><span className={`badge ${pass ? 'pass' : 'fix'}`}>{b.verdict || '—'}</span></header>
            {b.what && <p>{b.what}</p>}
            <div className="meta"><span className="mono">{b.file}</span></div>
            <div className="checks">{b.checks}</div>
          </article>
        )
      })}
    </div>
  )
}

function Rtl({ design, files }: { design: string; files: string[] }) {
  const svs = files.filter(f => /\.(sv|v)$/.test(f) && !/(^|\/)tb_/.test(f))
  const [path, setPath] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState('')
  const [result, setResult] = useState<{ kind: string; r: Result } | null>(null)
  useEffect(() => { if (!path && svs.length) setPath(svs.find(f => f.endsWith('npu_pe.sv')) ?? svs[0]) }, [files])
  useEffect(() => {
    if (!path) return
    setResult(null)
    call('semiconductor', 'design_read', { design, path }).then(r => setText(r.text))
  }, [path, design])

  const module = text.match(/^\s*module\s+(\w+)/m)?.[1] ?? ''
  const tb = files.find(f => f.endsWith(`tb_${module}.sv`))
  const groups = svs.reduce<Record<string, string[]>>((g, f) => {
    const dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '.'
    ;(g[dir] ??= []).push(f)
    return g
  }, {})

  async function sources() {
    // The block plus the rest of its folder, so submodules resolve.
    const dir = path.slice(0, path.lastIndexOf('/') + 1)
    const sibs = svs.filter(f => f.startsWith(dir) && f !== path && !/soc_full|cpu_cluster/.test(f))
    const texts = await Promise.all(sibs.map(f => call('semiconductor', 'design_read', { design, path: f }).then(r => r.text)))
    return [text, ...texts].join('\n\n')
  }
  async function lint() {
    setBusy('lint')
    const rtl = await sources()
    setResult({ kind: `Verilator lint · top ${module}`, r: await call('semiconductor', 'rtl_lint', { rtl, top: module }) })
    setBusy('')
  }
  async function simulate() {
    if (!tb) return
    setBusy('sim')
    const [rtl, bench] = await Promise.all([sources(), call('semiconductor', 'design_read', { design, path: tb })])
    const tbTop = bench.text.match(/^\s*module\s+(\w+)/m)?.[1] ?? `tb_${module}`
    setResult({ kind: `Icarus simulation · ${tb}`, r: await call('semiconductor', 'rtl_simulate', { rtl, testbench: bench.text, tbTop }) })
    setBusy('')
  }

  return (
    <div className="rtl">
      <aside className="filetree" aria-label="RTL files">
        {Object.entries(groups).map(([dir, fs]) => (
          <div key={dir}>
            <div className="dir">{dir}/</div>
            {fs.map(f => (
              <button key={f} className={`file ${f === path ? 'on' : ''}`} onClick={() => setPath(f)}>{f.split('/').pop()}</button>
            ))}
          </div>
        ))}
      </aside>
      <div className="rtl-main">
        <div className="rtl-bar">
          <span className="mono">{path}</span>
          <span className="spacer" />
          <button disabled={!module || !!busy} onClick={lint}>{busy === 'lint' ? 'Linting…' : 'Lint live'}</button>
          <button className="primary" disabled={!tb || !!busy} onClick={simulate} title={tb ? '' : 'No testbench for this module'}>
            {busy === 'sim' ? 'Simulating…' : tb ? 'Simulate with testbench' : 'No testbench'}
          </button>
        </div>
        {result && <section className="card live"><h3>{result.kind}</h3><Output result={result.r} /></section>}
        <CodeView text={text} lang={path} />
      </div>
    </div>
  )
}

function Docs({ design, files }: { design: string; files: string[] }) {
  const docs = files.filter(f => f.endsWith('.md') && !f.includes('/'))
  const [doc, setDoc] = useState('README.md')
  const [text, setText] = useState('')
  useEffect(() => { call('semiconductor', 'design_read', { design, path: doc }).then(r => setText(r.text)) }, [doc, design])
  return (
    <div>
      <div className="tabs small">
        {docs.map(d => <button key={d} className={`tab ${d === doc ? 'on' : ''}`} onClick={() => setDoc(d)}>{d}</button>)}
      </div>
      <article className="card doc"><Markdown text={text} /></article>
    </div>
  )
}

/** Block diagram of the edge-AI SoC, drawn from its README. */
function SocDiagram() {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, accent = false) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" className={accent ? 'd-box acc' : 'd-box'} />
      <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" className="d-title">{title}</text>
      <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" className="d-sub">{sub}</text>
    </g>
  )
  return (
    <figure className="diagram">
      <svg viewBox="0 0 760 300" role="img" aria-label="Edge-AI SoC block diagram">
        {box(20, 20, 170, 54, 'Secure boot', 'SHA-256 root of trust')}
        {box(230, 20, 300, 54, '4 × RISC-V RV64 (CVA6)', 'L1/L2 caches · interrupts', true)}
        {box(570, 20, 170, 54, '2-D DMA → IOPMP', 'isolation, default deny')}
        <rect x="20" y="118" width="720" height="34" rx="6" className="d-bus" />
        <text x="380" y="140" textAnchor="middle" className="d-title">On-chip interconnect · decode · error response</text>
        {box(20, 196, 132, 74, '8 MB SRAM', 'SECDED ECC')}
        {box(166, 196, 160, 74, 'NPU', '64×64 · 8.19 TOPS', true)}
        {box(340, 196, 132, 74, 'LPDDR4', '25.6 GB/s')}
        {box(486, 196, 132, 74, 'Interfaces', 'CSI-2 PCIe USB Eth')}
        {box(632, 196, 108, 74, 'Safety', 'WDT · ERR · PMU')}
        <path d="M105 74 L105 118 M380 74 L380 118 M655 74 L655 118 M86 152 L86 196 M246 152 L246 196 M406 152 L406 196 M552 152 L552 196 M686 152 L686 196" className="d-wire" />
        <path d="M190 47 L230 47" className="d-wire arrow" />
      </svg>
      <figcaption>Secure boot releases the CPUs; masters (CPU, DMA through IOPMP) reach memory, the NPU and peripherals over one interconnect.</figcaption>
    </figure>
  )
}
