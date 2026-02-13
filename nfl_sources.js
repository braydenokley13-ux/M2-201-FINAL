export const DATA_LOCK_DATE = "2025-07-15";

export const SOURCE_CITATIONS = {
  otc_texture_2025_kc: {
    id: "otc_texture_2025_kc",
    label: "OTC 2025 texture chart (Chiefs)",
    fieldGroup: "capSpaceM, deadCapM, top cap hits",
    url: "https://overthecap.com/roster-texture-charts-2025",
  },
  otc_texture_2025_sf: {
    id: "otc_texture_2025_sf",
    label: "OTC 2025 texture chart (49ers)",
    fieldGroup: "capSpaceM, deadCapM, top cap hits",
    url: "https://overthecap.com/roster-texture-charts-2025",
  },
  otc_kc_2025: {
    id: "otc_kc_2025",
    label: "Chiefs 2025 cap table",
    fieldGroup: "backup team cap references",
    url: "https://overthecap.com/salary-cap/kansas-city-chiefs",
  },
  otc_sf_2025: {
    id: "otc_sf_2025",
    label: "49ers 2025 cap table",
    fieldGroup: "backup team cap references",
    url: "https://overthecap.com/salary-cap/san-francisco-49ers",
  },
  spotrac_kc_contracts: {
    id: "spotrac_kc_contracts",
    label: "Chiefs contract details",
    fieldGroup: "backup contract references",
    url: "https://www.spotrac.com/nfl/kansas-city-chiefs/",
  },
  spotrac_sf_contracts: {
    id: "spotrac_sf_contracts",
    label: "49ers contract details",
    fieldGroup: "backup contract references",
    url: "https://www.spotrac.com/nfl/san-francisco-49ers/",
  },
  nfl_ops_rules: {
    id: "nfl_ops_rules",
    label: "NFL operations and transaction rules",
    fieldGroup: "legality checks and transaction framing",
    url: "https://operations.nfl.com/inside-football-ops/players-legends/transactions/",
  },
  nfl_cba_index: {
    id: "nfl_cba_index",
    label: "NFL CBA references",
    fieldGroup: "salary cap and contract concepts",
    url: "https://nflpa.com/posts/active-nfl-players-approve-new-cba",
  },
  nfl_cap_model_guide: {
    id: "nfl_cap_model_guide",
    label: "Front Office City scoring model",
    fieldGroup: "composite formula, gates, and classroom model",
    url: "https://operations.nfl.com/inside-football-ops/players-legends/transactions/",
  },
};

export function listAllCitations() {
  return Object.values(SOURCE_CITATIONS);
}

export function getCitationById(citationId) {
  return SOURCE_CITATIONS[citationId] ?? null;
}

export function getCitationsByIds(ids = []) {
  const unique = [...new Set(ids)];
  return unique.map((id) => SOURCE_CITATIONS[id]).filter(Boolean);
}
