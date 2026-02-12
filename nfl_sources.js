export const DATA_LOCK_DATE = "2025-07-15";

export const SOURCE_CITATIONS = {
  otc_kc_2025: {
    id: "otc_kc_2025",
    label: "Chiefs 2025 cap table",
    fieldGroup: "capSpaceM, deadCapM, contract drivers",
    url: "https://overthecap.com/salary-cap/kansas-city-chiefs",
  },
  otc_sf_2025: {
    id: "otc_sf_2025",
    label: "49ers 2025 cap table",
    fieldGroup: "capSpaceM, deadCapM, contract drivers",
    url: "https://overthecap.com/salary-cap/san-francisco-49ers",
  },
  spotrac_kc_contracts: {
    id: "spotrac_kc_contracts",
    label: "Chiefs contract details",
    fieldGroup: "core contract values",
    url: "https://www.spotrac.com/nfl/kansas-city-chiefs/",
  },
  spotrac_sf_contracts: {
    id: "spotrac_sf_contracts",
    label: "49ers contract details",
    fieldGroup: "core contract values",
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
};

export function listAllCitations() {
  return Object.values(SOURCE_CITATIONS);
}

export function getCitationById(citationId) {
  return SOURCE_CITATIONS[citationId] ?? null;
}
