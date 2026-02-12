# NFL Capital Run Skeleton TODOs

## Built in this skeleton (working baseline)
- [x] NFL app entrypoint wired through `/Users/braydenwhite/Documents/BOW MODULE 2 201/index.html` and `/Users/braydenwhite/Documents/BOW MODULE 2 201/main.js`.
- [x] Setup flow requires learner team + difficulty before run start.
- [x] Locked 2025 snapshot data modules for teams, missions, events, and sources are in place.
- [x] Cumulative rules engine with legality checks, composite formula, difficulty gates, and AI margin gate is wired.
- [x] Difficulty mission counts and event quotas are implemented:
  - Rookie: 6 missions, 2 events
  - Pro: 9 missions, 3 events
  - Legend: 12 missions, 4 events
- [x] Role sequence enforcement is active: Agent -> League Office -> Owner.
- [x] Deadline pressure multiplier triggers in the final third of the run.
- [x] AI opponent decision logic scales by difficulty profile.
- [x] Claim code format is implemented: `M1-201-NFL-{DIFF}-{TEAM}-{XXX}`.
- [x] CSV export includes decision rows and a final summary row.
- [x] 3D shell (city + tower + mission nodes) with click-to-move and third-person orbit camera is active.
- [x] HUD + decision modal + formula breakdown modal + light SFX are connected.

## TODOs for next pass (me or another builder)
- [ ] **Data accuracy pass**: replace placeholder cap/contract values with final classroom-approved 2025 figures and verify each citation.
- [ ] **Citation granularity**: map every displayed numeric field to explicit citation IDs in UI (not just the source list panel).
- [ ] **3D polish**:
  - [ ] Add visual icon glyphs per role/zone.
  - [ ] Add stronger mission-path guidance lines.
  - [ ] Add richer tower interior floor differentiation.
- [ ] **Event balancing**: decide and implement whether random events should affect learner only or both learner and AI.
- [ ] **Mission content tuning**: rebalance option deltas so difficulty curves are classroom-tested.
- [ ] **Adaptive hints v2**: improve hint scaffolding with misconception detection instead of static per-level text.
- [ ] **Reporting**:
  - [ ] Add printable report layout.
  - [ ] Add per-role section totals in final report.
  - [ ] Add teacher review checksum in CSV for audit.
- [ ] **Audio pass**: replace oscillator beeps with short curated SFX files.
- [ ] **Testing**:
  - [ ] Add automated tests for mission count/event count rules.
  - [ ] Add tests for legality gate and AI margin thresholds.
  - [ ] Add tests for claim code issuance only on clear.
  - [ ] Add CSV schema validation tests.
- [ ] **Accessibility/mobile**:
  - [ ] Keyboard navigation for decision modal options.
  - [ ] Larger tap targets for small screens.
  - [ ] Voiceover labels for HUD metrics.

## Notes
- NBA files are untouched and not required for this scaffold.
- This is intentionally a skeleton-first build with clear extension points.
