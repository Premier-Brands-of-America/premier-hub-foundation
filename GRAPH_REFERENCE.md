# Graph visual reference — adapt from NexoString (owner-provided)

The owner has a polished force-graph in his **NexoString** project. Use it as the
visual REFERENCE for redesigning Premier Hub's Graph. Both use
`react-force-graph-2d`, so the canvas draw techniques transfer directly.

READ THESE FILES on this machine before redesigning the Graph:
- `~/Developer/Nexostring/docs/redesign/03_graph_design.md`  (full visual+behavioral spec)
- `~/Developer/Nexostring/components/cortex/ForceGraph.tsx`   (the actual draw functions)
- `~/Developer/Nexostring/docs/redesign/02_design_system.md`  (the token system it references)

## What to take (the aesthetic / techniques)
- **Near-dark canvas**, nodes as **filled circles with translucent fill + 1px colored
  stroke + a soft halo/glow bloom** (radial gradient), color by semantic entity token.
- **No icons inside small nodes** — identity = color + label + position.
- **Clean labels**: small mono/uppercase, with a SUBTLE semi-transparent backplate
  (`surface / ~0.65`) and padding — NOT the current opaque white/black boxes. And
  **declutter**: only show labels when zoomed-in past a threshold or on hover/selection.
- **State machine** per node: idle (gentle pulse) / hover (brighter + tooltip) /
  active / selected (distinct accent ring). Soft, performance-safe.
- **Edges**: thin, color/weight by relation type, optional subtle directional particle
  drift for "alive" feel.
- Map all of this to Premier Hub's OWN tokens (neutral carbon + crimson accent; entity
  colors from the existing entity tokens), NOT NexoString's saffron/cyan palette.

## What to ADAPT (do NOT copy verbatim)
- NexoString's graph is a 5-node "constellation" with a fixed radial layout. Premier
  Hub's graph has ~25 nodes and uses force layout — KEEP the force layout; take the
  node/edge/label *rendering quality* and *state polish*, not the 5-node radial scheme.
- Result goal: Premier Hub's Graph should look as polished as NexoString's, in Premier's
  enterprise/Linear palette, with the ugly label boxes gone.
