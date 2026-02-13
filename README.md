# Front Office City: NFL Capital Run

NFL-only 3D front-office simulation for middle school learners (7th/8th grade).

## Snapshot Lock
- Season: 2025 (locked snapshot)
- Teams: Kansas City Chiefs and San Francisco 49ers only
- Source mode: OTC texture 2025 snapshot with linked citations in UI

## Run Locally
1. Open the project folder.
2. Serve files with a static server, for example:

```bash
python3 -m http.server 8000
```

3. Open `http://127.0.0.1:8000/`.

## Test Commands
- Run automated tests:

```bash
npm test
```

- Run deterministic smoke pass:

```bash
npm run smoke
```

- Run balance simulation harness:

```bash
npm run sim:balance
```

## Core Gameplay Locks
- Role order is fixed: Agent -> League Office -> Owner.
- Difficulty mission/event totals are fixed:
  - Rookie: 6 missions, 2 events
  - Pro: 9 missions, 3 events
  - Legend: 12 missions, 4 events
- Composite formula and gate rules are locked in `nfl_rules.js`.
- Claim code format is locked: `M1-201-NFL-{DIFF}-{TEAM}-{XXX}`.

## Mission Catalog
- Active missions and learning objectives are documented in `docs/mission-matrix.md`.
- Option-level tuning metadata is available via additive `tuningTags` on each mission option.
- Future placeholders (`AGENT-005`, `LEAGUE-005`, `OWNER-005`) are backlog-only and are not active in `buildMissionPlan()`.

## Teacher Workflow
- End-of-run report shows gate outcomes, per-role summary, metrics, AI comparison, XP, claim code, and review checksum.
- CSV export includes per-decision rows plus a final summary row.
