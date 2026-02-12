import { getCitationById } from "./nfl_sources.js";

/**
 * @typedef {Object} NFLContractDriver
 * @property {string} player
 * @property {number} capHitM
 * @property {number} deadCapM
 * @property {string} citationId
 */

/**
 * @typedef {Object} NFLTeamSnapshot
 * @property {string} id
 * @property {string} displayName
 * @property {number} season
 * @property {number} capSpaceM
 * @property {number} deadCapM
 * @property {NFLContractDriver[]} coreContracts
 * @property {string[]} deadCapDrivers
 * @property {{cap_health:number,roster_strength:number,flexibility:number,player_relations:number,franchise_value_growth:number}} initialMetrics
 * @property {Record<string, string[]>} fieldCitations
 */

/** @type {NFLTeamSnapshot[]} */
export const TEAM_SNAPSHOTS = [
  {
    id: "KC",
    displayName: "Kansas City Chiefs",
    season: 2025,
    capSpaceM: 12.1,
    deadCapM: 18.4,
    coreContracts: [
      {
        player: "Patrick Mahomes",
        capHitM: 66.3,
        deadCapM: 99.8,
        citationId: "spotrac_kc_contracts",
      },
      {
        player: "Chris Jones",
        capHitM: 34.7,
        deadCapM: 54.4,
        citationId: "spotrac_kc_contracts",
      },
      {
        player: "Jawaan Taylor",
        capHitM: 27.4,
        deadCapM: 34.0,
        citationId: "spotrac_kc_contracts",
      },
    ],
    deadCapDrivers: [
      "Legacy prorations from veteran deals",
      "Void-year accelerations on select contracts",
    ],
    initialMetrics: {
      cap_health: 64,
      roster_strength: 83,
      flexibility: 60,
      player_relations: 72,
      franchise_value_growth: 86,
    },
    fieldCitations: {
      capSpaceM: ["otc_kc_2025"],
      deadCapM: ["otc_kc_2025"],
      coreContracts: ["spotrac_kc_contracts"],
      transactionRules: ["nfl_ops_rules", "nfl_cba_index"],
    },
  },
  {
    id: "SF",
    displayName: "San Francisco 49ers",
    season: 2025,
    capSpaceM: 9.4,
    deadCapM: 21.2,
    coreContracts: [
      {
        player: "Trent Williams",
        capHitM: 31.8,
        deadCapM: 43.7,
        citationId: "spotrac_sf_contracts",
      },
      {
        player: "Fred Warner",
        capHitM: 27.1,
        deadCapM: 33.1,
        citationId: "spotrac_sf_contracts",
      },
      {
        player: "Nick Bosa",
        capHitM: 25.2,
        deadCapM: 67.8,
        citationId: "spotrac_sf_contracts",
      },
    ],
    deadCapDrivers: [
      "Large veteran restructures with future proration",
      "Bonus acceleration risk on early exits",
    ],
    initialMetrics: {
      cap_health: 58,
      roster_strength: 85,
      flexibility: 57,
      player_relations: 75,
      franchise_value_growth: 84,
    },
    fieldCitations: {
      capSpaceM: ["otc_sf_2025"],
      deadCapM: ["otc_sf_2025"],
      coreContracts: ["spotrac_sf_contracts"],
      transactionRules: ["nfl_ops_rules", "nfl_cba_index"],
    },
  },
];

export function listTeams() {
  return TEAM_SNAPSHOTS.map((team) => ({ ...team }));
}

export function getTeamSnapshotById(teamId) {
  const found = TEAM_SNAPSHOTS.find((team) => team.id === teamId);
  if (!found) {
    return null;
  }
  return JSON.parse(JSON.stringify(found));
}

export function getTeamCitations(teamId) {
  const team = TEAM_SNAPSHOTS.find((entry) => entry.id === teamId);
  if (!team) {
    return [];
  }
  return Object.values(team.fieldCitations)
    .flat()
    .map((citationId) => getCitationById(citationId))
    .filter(Boolean);
}
