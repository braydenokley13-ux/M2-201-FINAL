# NFL Capital Run Build Tracker

## Completed
- [x] NFL app entrypoint wired and running from `index.html` -> `main.js`.
- [x] Setup flow requires team + difficulty before run start.
- [x] 2025 snapshot data updated with locked OTC texture references in `nfl_sources.js` and `nfl_teams.js`.
- [x] Dead-cap legality threshold updated to support real 2025 baselines (`DEAD_CAP_SOFT_LIMIT_M = 130`).
- [x] Field-level citation links shown in HUD, mission modal, formula modal, and report.
- [x] Added `getTeamFieldCitations(teamId, fieldKey)` API in `nfl_teams.js`.
- [x] Mission + AI balancing pass with deterministic harness (`scripts/simulate-balance.mjs`).
- [x] 3D world upgraded with stronger district visuals, role iconography, route guidance lines, urgency pulses, destination marker, and smoother camera behavior.
- [x] Adaptive hints implemented in `nfl_hints.js` and wired into decision flow.
- [x] Final report expanded with per-role summary and teacher checksum display.
- [x] CSV schema extended with `review_checksum`.
- [x] Real SFX assets added under `assets/sfx/` with fallback audio synthesis.
- [x] Automated test suite added under `tests/`.
- [x] CI workflow added at `.github/workflows/ci.yml`.
- [x] Project run/test docs added in `README.md`.

## Remaining Manual Verification
- [ ] Desktop playthrough visual polish check (camera comfort + readability).
- [ ] Mobile viewport playthrough check at `<=960px`.
- [ ] Classroom UAT pass with learners/teacher feedback.

## Locked Defaults
- NFL-only mode, KC/SF only, 2025 snapshot lock, unlimited graded attempts.
- Role order fixed: Agent -> League Office -> Owner.
- Claim code stays `M1-201-NFL-{DIFF}-{TEAM}-{XXX}`.
