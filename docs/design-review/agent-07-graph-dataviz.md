# Agent 07 — Graph & data-viz quality

**Perspective:** The graph is the marquee visual; it must read as polished and legible, and charts must be instantly interpretable.

**Findings**
- ✅ Graph: token edges, node halo, selection/hover glow in `--primary`, label backing pills for legibility, hi-DPI rendering, legend with per-type counts + relation-style key, live stats pill, polished empty/loading. Strong enterprise upgrade.
- ✅ Charts: 5 complementary views (status pie, due-health pie, bucket/priority/assignee bars) from a single tested metrics module.
- ⚠️ medium — chart pies have no inline legend/labels (rely on tooltip hover). Add small legends or value labels for at-a-glance reading.
- ⚠️ low — assignee bar y-axis width fixed at 90px may clip very long names.

**Direction:** Graph is done to "super-professional" bar (owner priority met). Add chart legends/value labels as a quick nice-to-have.
