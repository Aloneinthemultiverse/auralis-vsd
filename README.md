# Auralis VSD — semiconductor design studio

A separate application for chip design. It has no design logic of its own: it is an
**MCP client** of two servers and a UI over their tools.

| Server | URL | Gives VSD |
|---|---|---|
| Auralis core | `http://localhost:8080/mcp` | problems, research, RTL design loop (local or Kaggle GPU), knowledge search, 2-bit graph RAG |
| Auralis semiconductor | `http://localhost:8091/mcp` | `rtl_lint` (Verilator), `rtl_simulate` (Icarus), `rtl_synthesize` (Yosys), `semiconductor_validate` |

```
browser ── /api ──> VSD server :8095 (Java, Spring Boot 4.1, MCP Java SDK 2.0)
                       ├── MCP streamable HTTP ──> Auralis core :8080/mcp
                       └── MCP streamable HTTP ──> semiconductor :8091/mcp
```

## Views

- **Design flow** — specify the chip (`problem_start`) → watch research (`problem_status`)
  → generate RTL blocks locally or on Kaggle (`problem_design_blocks`, `problem_design_kaggle`)
  → inspect versions (`design_status`). Ids flow from step to step.
- **RTL workbench** — edit RTL and a testbench, then lint / simulate / synthesize / validate.
- **Knowledge** — hybrid search and 2-bit graph RAG side by side, with relation paths
  (`[TERM]`, `-MENTIONS->`, `-NEXT->`) highlighted.
- **MCP console** — every tool on every server, with a form generated from its JSON schema.

Forms are built from each tool's input schema, so new server tools show up without UI changes.
Servers connect lazily and reconnect, so VSD runs even when one is down.

## Run

```bash
# Auralis stack first (core :8080, semiconductor :8091): ../Auraelis/scripts/start-auralis.sh
scripts/start-vsd.sh          # builds the UI into the server and starts it on :8095
```

Develop the UI with hot reload: `cd ui && npm run dev` (http://localhost:5175, proxies `/api`).
Server ports are in `server/src/main/resources/application.yml` (`vsd.servers`).
