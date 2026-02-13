# NFL Mission Matrix

This matrix lists all active missions in the capstone plus non-active future pack placeholders.

## Active Missions (Used by `buildMissionPlan()`)

| Mission ID | Role | Zone | Urgency | Title | Learning Objective |
| --- | --- | --- | --- | --- | --- |
| AGENT-001 | AGENT | CONTRACT_ROW | normal | Extension Timing Window | Compare extension timing choices and their cap/trust tradeoffs. |
| AGENT-002 | AGENT | TEAM_FACILITY | deadline | Training Camp Holdout Threat | Resolve holdout pressure while preserving cap flexibility and team trust. |
| AGENT-003 | AGENT | CONTRACT_ROW | normal | Veteran Release or Restructure | Evaluate restructure versus release using dead-cap and roster impact. |
| AGENT-004 | AGENT | TEAM_FACILITY | deadline | Depth Injury Replacement | Choose replacement strategy balancing short-term roster stability and long-term cap room. |
| LEAGUE-001 | LEAGUE_OFFICE | LEAGUE_OFFICE_FLOOR | normal | Contract Compliance Review | Apply league compliance checks without unnecessary competitive harm. |
| LEAGUE-002 | LEAGUE_OFFICE | MEDIA_PLAZA | deadline | Media Leak on Cap Maneuver | Manage public narrative while protecting lawful front-office process. |
| LEAGUE-003 | LEAGUE_OFFICE | LEAGUE_OFFICE_FLOOR | normal | Tampering Check Question | Distinguish legal contact practices and enforce balanced league integrity. |
| LEAGUE-004 | LEAGUE_OFFICE | MEDIA_PLAZA | deadline | Disciplinary Fine Decision | Calibrate discipline to uphold rules and retain stakeholder trust. |
| OWNER-001 | OWNER | OWNER_SUITE_FLOOR | normal | Stadium Revenue Allocation | Allocate revenue to improve value growth without weakening team operations. |
| OWNER-002 | OWNER | BOARDROOM_FLOOR | deadline | Trade Approval Window | Approve/reject major trade risk under time pressure and ownership goals. |
| OWNER-003 | OWNER | OWNER_SUITE_FLOOR | normal | Headcount and Analytics Budget | Balance operating cost control versus long-term competitive advantage. |
| OWNER-004 | OWNER | BOARDROOM_FLOOR | deadline | Franchise Value Strategy Call | Choose growth strategy that protects downside while improving valuation. |

## Future Pack Placeholder Missions (Not Active)

These entries are backlog-only and are **not included** in current `buildMissionPlan()` slices.

| Mission ID | Role | Zone | Urgency | Title | Learning Objective | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AGENT-005 | AGENT | CONTRACT_ROW | normal | Backlog: Complex Incentive Ladder | Model incentive ladders and upside/downside cap scenarios before final guarantees. | BACKLOG_ONLY |
| LEAGUE-005 | LEAGUE_OFFICE | LEAGUE_OFFICE_FLOOR | normal | Backlog: Compliance Appeal Window | Practice evidence-based league communication and risk-managed response timing. | BACKLOG_ONLY |
| OWNER-005 | OWNER | BOARDROOM_FLOOR | deadline | Backlog: Franchise Debt Structure Decision | Compare growth financing options while protecting cap stability and team trust. | BACKLOG_ONLY |

## Notes
- Locked active counts remain unchanged: Rookie 6, Pro 9, Legend 12.
- Role order remains fixed: Agent -> League Office -> Owner.
- Option-level `tuningTags` are additive metadata and backward-compatible.
