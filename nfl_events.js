/**
 * @typedef {Object} NFLEvent
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {"injury"|"owner"|"media"|"locker_room"} type
 * @property {number} capDeltaM
 * @property {number} deadCapDeltaM
 * @property {{cap_health:number,roster_strength:number,flexibility:number,player_relations:number,franchise_value_growth:number}} metricDeltas
 * @property {string[]} citationIds
 */

/** @type {NFLEvent[]} */
const EVENT_POOL = [
  {
    id: "EVT-001",
    title: "Practice Injury Scare",
    description: "A key rotation player misses time and depth stress rises.",
    type: "injury",
    capDeltaM: -1.6,
    deadCapDeltaM: 0,
    metricDeltas: {
      cap_health: -1,
      roster_strength: -3,
      flexibility: -1,
      player_relations: -1,
      franchise_value_growth: 0,
    },
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "EVT-002",
    title: "Owner Media Pressure",
    description:
      "Ownership pushes for visible progress after a rough news cycle.",
    type: "owner",
    capDeltaM: 0,
    deadCapDeltaM: 0,
    metricDeltas: {
      cap_health: 0,
      roster_strength: 0,
      flexibility: -1,
      player_relations: -1,
      franchise_value_growth: -2,
    },
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "EVT-003",
    title: "Positive Fan Momentum",
    description: "A viral campaign boosts optimism and sponsor energy.",
    type: "media",
    capDeltaM: 0.4,
    deadCapDeltaM: 0,
    metricDeltas: {
      cap_health: 0,
      roster_strength: 0,
      flexibility: 1,
      player_relations: 1,
      franchise_value_growth: 3,
    },
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "EVT-004",
    title: "Locker Room Friction",
    description:
      "Two position groups dispute role expectations after roster changes.",
    type: "locker_room",
    capDeltaM: 0,
    deadCapDeltaM: 0,
    metricDeltas: {
      cap_health: 0,
      roster_strength: -1,
      flexibility: 0,
      player_relations: -4,
      franchise_value_growth: -1,
    },
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "EVT-005",
    title: "Unexpected Sponsor Offer",
    description:
      "A local partnership proposal appears with fast approval timelines.",
    type: "media",
    capDeltaM: 0.9,
    deadCapDeltaM: 0,
    metricDeltas: {
      cap_health: 1,
      roster_strength: 0,
      flexibility: 1,
      player_relations: 0,
      franchise_value_growth: 2,
    },
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "EVT-006",
    title: "Minor League Memo Audit",
    description:
      "The league asks for quick clarifications that consume decision bandwidth.",
    type: "owner",
    capDeltaM: -0.4,
    deadCapDeltaM: 0,
    metricDeltas: {
      cap_health: 0,
      roster_strength: 0,
      flexibility: -2,
      player_relations: 0,
      franchise_value_growth: -1,
    },
    citationIds: ["nfl_ops_rules"],
  },
];

export function listNFLEvents() {
  return EVENT_POOL.map((event) => JSON.parse(JSON.stringify(event)));
}
