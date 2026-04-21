# Metrics — FoodFlow

Append-only JSONL observability files. Schema: see squad's `shared/schemas/metrics-schema.md`.

- `turns.jsonl` — one line per agent turn (tokens, duration, skills invoked)
- `leadtime.jsonl` — one line per lifecycle event (phase/HITL/iteration/cycle start/end)
- `summary.json` — regenerated on demand via `node scripts/metrics-report.mjs <this-destination-repo>`

Do not edit these files manually. Never commit them unless you want to track session history in VCS.
