import { getCitationById, getCitationsByIds } from "./nfl_sources.js";

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
    capSpaceM: 1.3,
    deadCapM: 22.7,
    coreContracts: [
      {
        player: "Patrick Mahomes",
        capHitM: 28.1,
        deadCapM: 99.8,
        citationId: "otc_texture_2025_kc",
      },
      {
        player: "Jawaan Taylor",
        capHitM: 27.4,
        deadCapM: 34.0,
        citationId: "otc_texture_2025_kc",
      },
      {
        player: "Chris Jones",
        capHitM: 23.6,
        deadCapM: 54.4,
        citationId: "otc_texture_2025_kc",
      },
    ],
    deadCapDrivers: [
      "Legacy prorations from veteran deals",
      "Void-year accelerations on select contracts",
    ],
    initialMetrics: {
      cap_health: 60,
      roster_strength: 82,
      flexibility: 56,
      player_relations: 72,
      franchise_value_growth: 86,
    },
    fieldCitations: {
      capSpaceM: ["otc_texture_2025_kc"],
      deadCapM: ["otc_texture_2025_kc"],
      coreContracts: ["otc_texture_2025_kc"],
      compositeModel: ["nfl_cap_model_guide"],
      transactionRules: ["nfl_ops_rules", "nfl_cba_index"],
    },
  },
  {
    id: "SF",
    displayName: "San Francisco 49ers",
    season: 2025,
    capSpaceM: 20.0,
    deadCapM: 103.8,
    coreContracts: [
      {
        player: "Trent Williams",
        capHitM: 21.1,
        deadCapM: 43.7,
        citationId: "otc_texture_2025_sf",
      },
      {
        player: "Nick Bosa",
        capHitM: 20.4,
        deadCapM: 67.8,
        citationId: "otc_texture_2025_sf",
      },
      {
        player: "Fred Warner",
        capHitM: 16.1,
        deadCapM: 33.1,
        citationId: "otc_texture_2025_sf",
      },
    ],
    deadCapDrivers: [
      "Large veteran restructures with future proration",
      "Bonus acceleration risk on early exits",
    ],
    initialMetrics: {
      cap_health: 56,
      roster_strength: 85,
      flexibility: 54,
      player_relations: 75,
      franchise_value_growth: 84,
    },
    fieldCitations: {
      capSpaceM: ["otc_texture_2025_sf"],
      deadCapM: ["otc_texture_2025_sf"],
      coreContracts: ["otc_texture_2025_sf"],
      compositeModel: ["nfl_cap_model_guide"],
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

export function getTeamFieldCitations(teamId, fieldKey) {
  const team = TEAM_SNAPSHOTS.find((entry) => entry.id === teamId);
  if (!team) {
    return [];
  }
  const ids = team.fieldCitations[fieldKey] ?? [];
  return getCitationsByIds(ids);
}

export function getContractDriverCitation(contract) {
  return getCitationById(contract.citationId);
}
