import { useState } from 'react'
import { call, type Result, type ToolInfo } from './api'
import { Output } from './Output'

const RTL = `// file: counter.sv
module counter #(parameter int W = 8) (
  input  logic         clk,
  input  logic         rst_n,
  input  logic         en,
  output logic [W-1:0] q
);
  always_ff @(posedge clk) begin
    if (!rst_n)  q <= '0;
    else if (en) q <= q + 1'b1;
  end
endmodule
`

const TB = `// file: tb_counter.sv
module tb_counter;
  logic clk = 0, rst_n = 0, en = 0;
  logic [7:0] q;
  int fails = 0;
  counter dut (.*);
  always #5 clk = ~clk;
  initial begin
    @(posedge clk); @(posedge clk); rst_n = 1;
    @(negedge clk);
    if (q !== 0) begin $display("FAIL reset"); fails++; end else $display("PASS reset");
    en = 1; repeat (10) @(posedge clk); @(negedge clk);
    if (q !== 10) begin $display("FAIL count q=%0d", q); fails++; end else $display("PASS count");
    if (fails == 0) $display("ALL TESTS PASSED");
    $finish;
  end
endmodule
`

type Step = 'lint' | 'simulate' | 'synthesize' | 'validate'

/** Hand-edit RTL and run the semiconductor server's EDA tools on it. */
export function Workbench({ tools }: { tools: ToolInfo[] }) {
  const [rtl, setRtl] = useState(RTL)
  const [tb, setTb] = useState(TB)
  const [top, setTop] = useState('counter')
  const [busy, setBusy] = useState<Step | null>(null)
  const [results, setResults] = useState<Partial<Record<Step, Result>>>({})

  async function run(step: Step) {
    setBusy(step)
    const tbTop = (tb.match(/module\s+(\w+)/) ?? [])[1] ?? `tb_${top}`
    let r: Result
    if (step === 'lint') r = await call('semiconductor', 'rtl_lint', { rtl, top })
    else if (step === 'simulate') r = await call('semiconductor', 'rtl_simulate', { rtl, testbench: tb, tbTop })
    else if (step === 'synthesize') r = await call('semiconductor', 'rtl_synthesize', { rtl, top })
    else {
      const v = tools.find(t => t.name === 'semiconductor_validate')
      const key = Object.keys(v?.inputSchema.properties ?? { files: {} })[0]
      const files = { [`${top}.sv`]: rtl, [`${tbTop}.sv`]: tb }
      r = await call('semiconductor', 'semiconductor_validate', { [key]: JSON.stringify(files) })
    }
    setResults(prev => ({ ...prev, [step]: r }))
    setBusy(null)
  }

  const steps: [Step, string][] = [['lint', 'Lint · Verilator'], ['simulate', 'Simulate · Icarus'],
    ['synthesize', 'Synthesize · Yosys'], ['validate', 'Full validate']]
  return (
    <div className="workbench">
      <div className="editors">
        <Editor title="RTL" value={rtl} onChange={setRtl} />
        <Editor title="Testbench" value={tb} onChange={setTb} />
      </div>
      <div className="row">
        <label className="inline">Top <input value={top} onChange={e => setTop(e.target.value)} /></label>
        {steps.map(([s, label]) => (
          <button key={s} className={s === 'validate' ? 'primary' : ''} disabled={busy !== null}
            onClick={() => run(s)}>
            <Dot r={results[s]} /> {busy === s ? 'Running…' : label}
          </button>
        ))}
      </div>
      {steps.filter(([s]) => results[s]).map(([s, label]) => (
        <section key={s} className="card">
          <h3><Dot r={results[s]} /> {label}</h3>
          <Output result={results[s]!} />
        </section>
      ))}
    </div>
  )
}

function Dot({ r }: { r?: Result }) {
  if (!r) return <span className="dot idle" />
  const bad = r.error || /\b(FAIL|%Error|ERROR)\b/.test(r.text)
  return <span className={`dot ${bad ? 'bad' : 'good'}`} />
}

function Editor({ title, value, onChange }: { title: string; value: string; onChange: (v: string) => void }) {
  const n = value.split('\n').length
  return (
    <div className="editor">
      <div className="editor-title">{title} <span className="muted">{n} lines</span></div>
      <div className="editor-body">
        <pre className="gutter">{Array.from({ length: n }, (_, i) => i + 1).join('\n')}</pre>
        <textarea spellCheck={false} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  )
}
