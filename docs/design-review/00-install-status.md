# Phase 2 — Design skill install status

Installed **project-local** into `.claude/skills/` via `git clone --depth 1`
(non-interactive; the `/plugin` marketplace flow needs an interactive TTY and is
not available headless). The cloned repos are git-ignored (local tooling, not app
code). The official Anthropic **frontend-design** skill was already present in the
plugin cache (used during the v2 build) and remained available throughout.

| # | Skill | Installed? | Method | Has SKILL.md | Main focus |
|---|---|---|---|---|---|
| 1 | nexu-io/open-design | ✅ | git clone | ✅ (skills/research-decision-room) | Local-first design app, 200+ design skills/systems |
| 2 | OpenCoworkAI/open-codesign | ✅ | git clone | README-only (collection) | Multi-model BYOK design workflows |
| 3 | anthropics/claude-code · frontend-design | ✅ (pre-installed) | plugin cache | ✅ | Official Anthropic frontend-design skill |
| 4 | Owl-Listener/designer-skills | ✅ | git clone | README-only (collection) | Research, systems, strategy, UI, interaction, prototyping |
| 5 | freshtechbro/claudedesignskills | ✅ | git clone | README-only (collection) | 3D/WebGL, animation, modern web (Three.js, GSAP, Framer) |
| 6 | JimLiu/baoyu-design | ✅ | git clone | ✅ (skills/baoyu-design) | Claude Design engine: mockups, prototypes, dashboards |
| 7 | jiji262/claude-design-skill | ✅ | git clone | ✅ | Expert designer for HTML artifacts |
| 8 | dominikmartn/nothing-design-skill | ✅ | git clone | ✅ (nothing-design) | Nothing-style monochrome/typographic/industrial system |
| 9 | Owl-Listener/ai-design-skills | ✅ | git clone | README-only (collection) | Designing AI products/agents, alignment-aware UX |
| 10 | metaskills/skill-design-guide | ✅ | git clone | ✅ | Meta-skill for designing/building/testing skills |

**Result:** all 10 targets obtained (9 cloned + 1 pre-installed). README-only repos
are skill *collections* whose individual SKILL.md files live in subfolders; they are
usable as design references. No installs blocked the run.

**Note:** Claude Code also ships a rich set of first-party design skills already
available in this environment (`ui-ux-pro-max`, `frontend-design`, `design-system`,
`ui-styling`, `design`, `brand`, `slides`). These, plus the official frontend-design
skill, served as the working "design agents" for the Phase 3 council
(see `decision.md` and the per-agent reports).
