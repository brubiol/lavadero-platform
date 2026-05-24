# Screenshot slots referenced by the main README

The top-level `README.md` references four PNGs in this folder. Drop them in
exactly with these filenames — no other edits needed.

| File | What to capture |
|---|---|
| `dashboard.png` | Operator Dashboard at the start of a shift. Live KPIs (cars, revenue, cash, tickets), recent tickets table, shift status capsule visible. Log in as `dueno`, land on `/`. |
| `ai-chat.png` | Owner AI Command Center mid-conversation. Show: chat panel with a user message + assistant response with the "Números usados" block, right rail with Brief del día + Alertas. Navigate to `/ai`, ask "¿cómo fue el día de hoy?". |
| `vigilancia.png` | Anti-theft Vigilancia screen. Show: the four red-flag KPI tiles (Cortesías, Anulados, Ediciones rápidas, Faltantes) and the per-actor table below. Navigate to `/vigilancia`. |
| `nuevo-ticket.png` | New Ticket form. Show: the four numbered sections compact above the fold, the vehicle dropdown grouped by category (auto / moto / RAZR / personal), and the receipt panel on the right showing a price. Navigate to `/tickets/nuevo`. |

## Capture tips

- Browser at **1440 × 900** or **1680 × 1050** — fits well inside a GitHub
  README 2×2 grid without horizontal scroll.
- Light theme. The app's design system is calibrated for light backgrounds
  and the violet/emerald palette pops better on white.
- Use Chrome / Firefox dev tools to set a fixed viewport, take the screenshot
  with **Cmd+Shift+5** (macOS) → "Capture entire screen", then crop to the
  viewport area.
- Compress PNGs through [tinypng.com](https://tinypng.com) before committing
  — keeps the repo light. Target under 200 KB each.
- For `ai-chat.png` specifically: the deterministic AI fallback in the demo
  environment returns simple bullet-pointed text. If you want a richer
  screenshot, ask multiple questions to build conversation depth before
  capturing.
