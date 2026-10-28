# Auralis VSD — demo script (about 10 minutes)

## Before the demo

```bash
# Docker Desktop must be running. Then:
bash "C:/Users/Sujit Narrayan M/Auraelis/scripts/start-auralis.sh"   # core, Laya, Ollama, TurboVec, semiconductor
bash "C:/Users/Sujit Narrayan M/auralis-vsd/scripts/start-vsd.sh"     # VSD on :8095
bash "C:/Users/Sujit Narrayan M/Auraelis/scripts/start-auralis.sh" status   # every line should be ✓
```

Open http://localhost:8095. In the left rail, both MCP servers should show a green dot.

## 1. The chip that was designed (Showcase, 4 min)

1. **How it was generated** tab: walk the timeline top to bottom — spec, evidence from the knowledge
   base, RTL block by block, verification, the Laya PASS/FIX loop, integration, records. Point at the
   block diagram: secure boot releases four RISC-V cores; CPU and DMA reach SRAM, the NPU, LPDDR4 and
   the interfaces over one interconnect.
2. **Blocks** tab: every block with what it does, how many checks passed, and Laya's verdict. Mention
   the SoC top went FIX three times before PASS, and that lint caught a dropped watchdog bit that
   simulation had missed.
3. **RTL & live verify** tab: `rtl/npu_pe.sv` opens. Scroll the SystemVerilog briefly, then press
   **Simulate with testbench**. Icarus runs the real testbench on the semiconductor server and prints
   `PASS all 804 checks … ALL TESTS PASSED` (about 20 s). Press **Lint live** to show Verilator.
4. **Design docs** tab: README (results, PPA estimate), HANDOFF (what a foundry receives), LESSONS (log).

Say clearly: RTL is verified in simulation and synthesis; one processing element was placed and routed
on an open 45 nm kit; 28 nm figures are estimates (no free 28 nm process kit); no silicon.

## 2. Verify any RTL yourself (RTL workbench, 2 min)

The counter example is preloaded. Press **Lint**, **Simulate**, **Synthesize**, then **Full validate**.
Optionally break it (delete the `else`) and lint again to show the error.

## 3. The retrieval (Knowledge, 2 min)

Ask: `what checks the boot image before the CVA6 cores start?`
- Left: `knowledge_search` — TurboVec 2-bit vectors + keyword + fact graph, re-ranked by Laya.
- Right: TurboVec-HippoRAG — the facts it matched (subject → relation → object) and the passages
  PageRank reached through them.
Explain: every node is a 2-bit code, every relationship an exact edge, ~10× smaller than HippoRAG with
the same multi-hop recall on HotpotQA, 2Wiki and MuSiQue.

## 4. Designing something new (Design flow, 2 min, optional)

Step 1, type a short spec (e.g. "a 16-bit CRC-CCITT generator with byte input and valid/ready"),
**Run problem_start**. The problem id flows into step 2 (research progress). Step 3 generates RTL
locally or on the Kaggle GPU; each version is linted, simulated, synthesized and judged PASS/FIX.
Generation takes minutes, so start it and come back, or show an earlier design in step 4.

## 5. Everything else (MCP console)

Every tool on both servers, with forms built from each tool's own parameters — the same tools Claude
Code uses through the Auralis plugin.

## If something is red

- A grey/red server dot: run the start scripts again; `logs/` in each repo has the server logs.
- Knowledge right panel says "index not ready": facts have not been extracted/imported yet
  (`knowledge_facts_import` after the Kaggle job, or `knowledge_facts_extract` for a few chunks).
