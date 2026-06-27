# Graph visual reference — MATCH NexoString quality (owner says it is "1000% better")

The current Premier Hub graph is a basic force-graph (flat saturated circles, plain
straight red edges). The owner's NexoString graph looks FAR better and you MUST port
its rendering techniques, not just remove label boxes.

READ FIRST (on this machine):
- `~/Developer/Nexostring/components/cortex/ForceGraph.tsx`  (the draw functions — copy the techniques)
- `~/Developer/Nexostring/docs/redesign/03_graph_design.md`  (node/edge anatomy spec)

Both use `react-force-graph-2d`, so these transfer directly to Premier Hub's
GraphCanvas. Adapt colors to Premier's WARM-dark + neutral/crimson + entity tokens
(NOT NexoString saffron/cyan). Keep the existing force layout (~25 nodes).

## The techniques that make it look premium (PORT THESE)

1. **Idle halo** behind every node — a cheap second translucent circle (no shadow):
   `ctx.beginPath(); ctx.arc(cx, cy, r + (isFocus?14:8), 0, 2*Math.PI);`
   `ctx.fillStyle = `hsl(${hsl} / ${isFocus?0.28:0.16})`; ctx.fill();`
2. **Soft glow bloom** on hover/selected/high-degree nodes via shadowBlur:
   `ctx.save(); ctx.shadowColor = `hsl(${hsl} / 0.55)`; ctx.shadowBlur = 8..18;`
   draw the filled node, then `ctx.restore();`
3. **Translucent node fill + thin stroke** (not flat saturated disks):
   fill `hsl(${hsl} / 0.55)` (brighter ~0.8 when focus/visited); stroke
   `hsl(${hsl} / 0.6)` lineWidth 1 (1.5 when focus).
4. **Curved gradient edges** (not straight bright-red lines): quadratic curve with a
   `createLinearGradient(s.x,s.y,t.x,t.y)` from source-color→target-color, low alpha
   (~0.35 idle), lineWidth 1. Color/weight by relation type, MUTED.
5. **Directional particles** drifting along edges for a subtle "alive" feel:
   `linkDirectionalParticles={1}` `linkDirectionalParticleWidth={2}`
   `linkDirectionalParticleSpeed={0.0008}` `linkDirectionalParticleColor`= muted token.
   (Bump count/width/alpha briefly on hover/selection.)
6. **Gentle idle bob** — tiny per-node positional oscillation so the graph feels
   alive at rest (a `bob(id, now)` offset added to cx/cy).
7. **Selected/hover ring** — a distinct accent outer ring (use crimson for selection)
   at `r + 5`, lineWidth 2.
8. **Labels** — clean, scale-aware font, decluttered (only near zoom-in / hover /
   selection), SUBTLE translucent backplate or none. NO opaque boxes.

## Palette (Premier, warm-dark)
- Canvas: the app warm-dark surface token (near-black warm charcoal), NOT pure black.
- Entity colors: DESATURATED, slightly warm, cohesive — Project=crimson (de-neoned),
  others muted categorical (no 90%-sat neon). Pull from the `--entity-*` tokens after
  you de-neon them in src/index.css.
- Edges + particles: low-key/muted, never bright magenta/red.

GOAL: the Premier Hub graph should read as a calm, glowing constellation on warm dark
— visually on par with NexoString — using Premier's own palette.
