import type { ReactNode } from 'react'

const KEYWORDS = new Set(('module endmodule input output inout logic wire reg always_ff always_comb always assign ' +
  'if else case endcase begin end for parameter localparam typedef enum struct packed function endfunction ' +
  'task endtask generate endgenerate genvar int unsigned signed posedge negedge initial import package endpackage ' +
  'unique priority default return interface endinterface modport property endproperty assert assume cover bind')
  .split(' '))

/** SystemVerilog-aware code view with line numbers (comments, strings, numbers, keywords, system tasks). */
export function CodeView({ text, lang }: { text: string; lang: string }) {
  const sv = /\.(sv|svh|v)$/.test(lang)
  const lines = text.replace(/\t/g, '    ').split('\n')
  let inBlock = false
  return (
    <div className="codeview" role="region" aria-label="Source code">
      <pre className="gutter" aria-hidden="true">{lines.map((_, i) => i + 1).join('\n')}</pre>
      <pre className="src">{lines.map((l, i) => {
        const [nodes, still] = sv ? highlight(l, inBlock) : [[l], false]
        inBlock = still
        return <span key={i}>{nodes}{'\n'}</span>
      })}</pre>
    </div>
  )
}

function highlight(line: string, inBlock: boolean): [ReactNode[], boolean] {
  const out: ReactNode[] = []
  let rest = line
  let k = 0
  if (inBlock) {
    const end = rest.indexOf('*/')
    if (end < 0) return [[<i key={0} className="c">{rest}</i>], true]
    out.push(<i key={k++} className="c">{rest.slice(0, end + 2)}</i>)
    rest = rest.slice(end + 2)
  }
  const re = /(\/\/.*$)|(\/\*.*?(\*\/|$))|("(?:[^"\\]|\\.)*")|(\$[a-zA-Z_]\w*)|(\d+'[sS]?[bBoOdDhH][0-9a-fA-F_xXzZ?]+|'[01xz]|\b\d[\d_]*\b)|(\b[a-zA-Z_]\w*\b)/g
  let last = 0
  let m: RegExpExecArray | null
  let open = false
  while ((m = re.exec(rest))) {
    if (m.index > last) out.push(rest.slice(last, m.index))
    const t = m[0]
    if (m[1]) out.push(<i key={k++} className="c">{t}</i>)
    else if (m[2]) { out.push(<i key={k++} className="c">{t}</i>); if (!m[3]) open = true }
    else if (m[4]) out.push(<i key={k++} className="s">{t}</i>)
    else if (m[5]) out.push(<i key={k++} className="f">{t}</i>)
    else if (m[6]) out.push(<i key={k++} className="n">{t}</i>)
    else if (KEYWORDS.has(t)) out.push(<i key={k++} className="k">{t}</i>)
    else out.push(t)
    last = m.index + t.length
  }
  if (last < rest.length) out.push(rest.slice(last))
  return [out, open]
}
