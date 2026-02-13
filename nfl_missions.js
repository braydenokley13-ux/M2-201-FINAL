/**
 * @typedef {"AGENT" | "LEAGUE_OFFICE" | "OWNER"} NFLRole
 */

/**
 * @typedef {Object} NFLMissionOption
 * @property {string} id
 * @property {string} label
 * @property {string} summaryKid
 * @property {string} summaryFrontOffice
 * @property {number} capDeltaM
 * @property {number} deadCapDeltaM
 * @property {{cap_health:number,roster_strength:number,flexibility:number,player_relations:number,franchise_value_growth:number}} metricDeltas
 * @property {string[]} citationIds
 * @property {string[]} [tuningTags]
 */

/**
 * @typedef {Object} NFLMission
 * @property {string} id
 * @property {NFLRole} role
 * @property {string} zone
 * @property {"normal"|"deadline"} urgency
 * @property {string} title
 * @property {string} description
 * @property {{rookie:string,pro:string,legend:string}} hints
 * @property {NFLMissionOption[]} options
 * @property {string[]} citationIds
 */

const AGENT_MISSIONS = [
  {
    id: "AGENT-001",
    role: "AGENT",
    zone: "CONTRACT_ROW",
    urgency: "normal",
    title: "Extension Timing Window",
    description:
      "A starter wants a new deal now. You can extend early, wait, or bridge with incentives.",
    hints: {
      rookie: "Try a move that keeps room under the cap while keeping trust high.",
      pro: "Balance flexibility and relations. Avoid locking too much future risk.",
      legend: "Model three-year downside before deciding.",
    },
    options: [
      {
        id: "A",
        label: "Early Extension",
        summaryKid: "Keep player happy now, but spend more cap space.",
        summaryFrontOffice:
          "Front-load guarantees for certainty and relationship stability.",
        capDeltaM: -7.5,
        deadCapDeltaM: 4.2,
        metricDeltas: {
          cap_health: -4,
          roster_strength: 4,
          flexibility: -5,
          player_relations: 6,
          franchise_value_growth: 2,
        },
        citationIds: ["nfl_ops_rules", "nfl_cba_index"],
      },
      {
        id: "B",
        label: "Incentive Bridge Deal",
        summaryKid: "Short deal now, revisit later.",
        summaryFrontOffice:
          "Two-year bridge with play-time incentives and optional conversion window.",
        capDeltaM: -3.2,
        deadCapDeltaM: 1.6,
        metricDeltas: {
          cap_health: 1,
          roster_strength: 2,
          flexibility: 3,
          player_relations: 1,
          franchise_value_growth: 1,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Wait Until Next Offseason",
        summaryKid: "Save money now, risk hurt feelings.",
        summaryFrontOffice:
          "Preserve immediate cap. Defer negotiation to next cap cycle.",
        capDeltaM: 0,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 2,
          roster_strength: -2,
          flexibility: 2,
          player_relations: -4,
          franchise_value_growth: -1,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["spotrac_kc_contracts", "spotrac_sf_contracts"],
  },
  {
    id: "AGENT-002",
    role: "AGENT",
    zone: "TEAM_FACILITY",
    urgency: "deadline",
    title: "Training Camp Holdout Threat",
    description:
      "An important player may hold out during camp. Decide how to respond under a short deadline.",
    hints: {
      rookie: "Holdouts can hurt chemistry. Fix it without breaking the cap.",
      pro: "Favor options that reduce locker-room damage while preserving flexibility.",
      legend: "Prioritize long-term leverage; avoid creating a bad precedent.",
    },
    options: [
      {
        id: "A",
        label: "Partial Guarantee Add-On",
        summaryKid: "Give a little guaranteed money to calm things down.",
        summaryFrontOffice:
          "Small guarantee trigger tied to camp participation to de-escalate quickly.",
        capDeltaM: -2.8,
        deadCapDeltaM: 1.1,
        metricDeltas: {
          cap_health: -1,
          roster_strength: 2,
          flexibility: -1,
          player_relations: 5,
          franchise_value_growth: 1,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Issue Team Statement Only",
        summaryKid: "Say the team is talking, but do not change deal.",
        summaryFrontOffice:
          "Communication-only approach. No immediate contract adjustment.",
        capDeltaM: 0,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 1,
          roster_strength: -2,
          flexibility: 1,
          player_relations: -3,
          franchise_value_growth: -1,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Accelerated Multi-Year Raise",
        summaryKid: "Pay big now so everyone is happy fast.",
        summaryFrontOffice:
          "Fast-track extension with immediate APY jump and guaranteed roster bonus.",
        capDeltaM: -10.2,
        deadCapDeltaM: 6.7,
        metricDeltas: {
          cap_health: -8,
          roster_strength: 4,
          flexibility: -7,
          player_relations: 8,
          franchise_value_growth: 2,
        },
        citationIds: ["spotrac_kc_contracts", "spotrac_sf_contracts"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "AGENT-003",
    role: "AGENT",
    zone: "CONTRACT_ROW",
    urgency: "normal",
    title: "Veteran Release or Restructure",
    description:
      "A veteran contract is squeezing flexibility. Pick release, restructure, or stay put.",
    hints: {
      rookie: "Restructure is safer than a hard cut in most classrooms.",
      pro: "Watch dead money and how it impacts next season.",
      legend: "Model this with downside scenarios for both seasons.",
    },
    options: [
      {
        id: "A",
        label: "Simple Restructure",
        summaryKid: "Move some money to later so this year is easier.",
        summaryFrontOffice:
          "Convert base salary to bonus to open this-year cap room with future proration.",
        capDeltaM: 5.6,
        deadCapDeltaM: 3.9,
        metricDeltas: {
          cap_health: 4,
          roster_strength: 1,
          flexibility: -2,
          player_relations: 1,
          franchise_value_growth: 1,
        },
        citationIds: ["nfl_cba_index"],
      },
      {
        id: "B",
        label: "Post-June Style Exit Plan",
        summaryKid: "Cut now with delayed cap impact split.",
        summaryFrontOffice:
          "Structured exit to split dead money impact and free near-term space.",
        capDeltaM: 7.2,
        deadCapDeltaM: 8.1,
        metricDeltas: {
          cap_health: 5,
          roster_strength: -3,
          flexibility: 2,
          player_relations: -2,
          franchise_value_growth: 0,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Keep Contract Untouched",
        summaryKid: "No risk now, no extra room either.",
        summaryFrontOffice:
          "Maintain status quo to avoid future acceleration risk.",
        capDeltaM: 0,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: -1,
          roster_strength: 0,
          flexibility: -1,
          player_relations: 1,
          franchise_value_growth: 0,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["otc_kc_2025", "otc_sf_2025"],
  },
  {
    id: "AGENT-004",
    role: "AGENT",
    zone: "TEAM_FACILITY",
    urgency: "deadline",
    title: "Depth Injury Replacement",
    description:
      "A depth chart injury creates a roster gap. Choose short-term patch vs long-term fit.",
    hints: {
      rookie: "Avoid panic spending.",
      pro: "Watch cap impact versus roster floor.",
      legend: "Use option value. Keep flexibility for later shocks.",
    },
    options: [
      {
        id: "A",
        label: "Sign Mid-Tier Veteran",
        summaryKid: "Buy a safer replacement right now.",
        summaryFrontOffice:
          "One-year veteran stopgap with moderate guarantees.",
        capDeltaM: -4.5,
        deadCapDeltaM: 1.9,
        metricDeltas: {
          cap_health: -2,
          roster_strength: 3,
          flexibility: -2,
          player_relations: 2,
          franchise_value_growth: 1,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Promote Practice Squad",
        summaryKid: "Cheaper move with some risk.",
        summaryFrontOffice:
          "Low-cost internal promotion to preserve optionality.",
        capDeltaM: -0.9,
        deadCapDeltaM: 0.2,
        metricDeltas: {
          cap_health: 1,
          roster_strength: 1,
          flexibility: 2,
          player_relations: 1,
          franchise_value_growth: 0,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Trade for Expensive Starter",
        summaryKid: "Big immediate upgrade, big cap pain.",
        summaryFrontOffice:
          "Aggressive trade with high cap hit and reduced future flexibility.",
        capDeltaM: -13.6,
        deadCapDeltaM: 4.5,
        metricDeltas: {
          cap_health: -9,
          roster_strength: 6,
          flexibility: -7,
          player_relations: 2,
          franchise_value_growth: 3,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
];

const LEAGUE_OFFICE_MISSIONS = [
  {
    id: "LEAGUE-001",
    role: "LEAGUE_OFFICE",
    zone: "LEAGUE_OFFICE_FLOOR",
    urgency: "normal",
    title: "Contract Compliance Review",
    description:
      "The league asks for a compliance update on recent bonus structures.",
    hints: {
      rookie: "Pick the cleanest legal path even if it is not the biggest gain.",
      pro: "Treat compliance speed and audit risk as tradeoffs.",
      legend: "Protect reputation and future approval velocity.",
    },
    options: [
      {
        id: "A",
        label: "Voluntary Refile + Notes",
        summaryKid: "Submit clear paperwork now.",
        summaryFrontOffice:
          "Refile documentation with cap treatment assumptions for faster validation.",
        capDeltaM: 0.4,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 1,
          roster_strength: 0,
          flexibility: 1,
          player_relations: 1,
          franchise_value_growth: 2,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Challenge Interpretation",
        summaryKid: "Argue for your cap method.",
        summaryFrontOffice:
          "Pursue an aggressive interpretation to preserve current cap handling.",
        capDeltaM: 1.1,
        deadCapDeltaM: 0.4,
        metricDeltas: {
          cap_health: 2,
          roster_strength: 0,
          flexibility: 1,
          player_relations: -1,
          franchise_value_growth: -1,
        },
        citationIds: ["nfl_cba_index"],
      },
      {
        id: "C",
        label: "Quiet Delay",
        summaryKid: "Wait and hope it is not urgent.",
        summaryFrontOffice:
          "Delay response and prioritize internal operations.",
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
    ],
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "LEAGUE-002",
    role: "LEAGUE_OFFICE",
    zone: "MEDIA_PLAZA",
    urgency: "deadline",
    title: "Media Leak on Cap Maneuver",
    description:
      "A leaked memo says your team is using loopholes. Handle PR and league trust now.",
    hints: {
      rookie: "Clear communication can save player relations.",
      pro: "Choose a response that limits value damage.",
      legend: "Manage both legal exposure and owner confidence.",
    },
    options: [
      {
        id: "A",
        label: "Joint League-Team Briefing",
        summaryKid: "Explain the truth with the league in public.",
        summaryFrontOffice:
          "Coordinate official briefing with legal references and timeline.",
        capDeltaM: -0.5,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: 0,
          player_relations: 2,
          franchise_value_growth: 3,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Minimal Statement",
        summaryKid: "Say little and move on.",
        summaryFrontOffice:
          "Issue controlled statement; avoid broader disclosure.",
        capDeltaM: 0,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: 1,
          player_relations: -1,
          franchise_value_growth: -1,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Blame External Agent",
        summaryKid: "Shift blame to someone else.",
        summaryFrontOffice:
          "Deflect accountability to third party representation.",
        capDeltaM: 0.5,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: 1,
          player_relations: -4,
          franchise_value_growth: -3,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "LEAGUE-003",
    role: "LEAGUE_OFFICE",
    zone: "LEAGUE_OFFICE_FLOOR",
    urgency: "normal",
    title: "Tampering Check Question",
    description:
      "League requests logs after rumors of early player contact.",
    hints: {
      rookie: "Honest records usually protect your clear condition.",
      pro: "Avoid legal risk even if short-term value dips.",
      legend: "Preserve long-term authority in negotiations.",
    },
    options: [
      {
        id: "A",
        label: "Full Data Disclosure",
        summaryKid: "Share everything and stay safe.",
        summaryFrontOffice:
          "Provide complete communication logs and timeline notes.",
        capDeltaM: -0.3,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: -1,
          player_relations: 1,
          franchise_value_growth: 2,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Limited Records",
        summaryKid: "Show some records, keep some private.",
        summaryFrontOffice:
          "Scoped compliance package with legal reservation.",
        capDeltaM: 0.2,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: 1,
          player_relations: -1,
          franchise_value_growth: -1,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Aggressive Legal Pushback",
        summaryKid: "Fight the request hard.",
        summaryFrontOffice:
          "Contest scope and delay disclosures pending outside counsel.",
        capDeltaM: 0.7,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: 2,
          player_relations: -3,
          franchise_value_growth: -3,
        },
        citationIds: ["nfl_cba_index"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "LEAGUE-004",
    role: "LEAGUE_OFFICE",
    zone: "MEDIA_PLAZA",
    urgency: "deadline",
    title: "Disciplinary Fine Decision",
    description:
      "A conduct issue triggers potential fines and PR fallout. Decide policy response quickly.",
    hints: {
      rookie: "Consistency and fairness help trust.",
      pro: "Balance internal message and external reputation.",
      legend: "Protect long-term player relations while preserving brand value.",
    },
    options: [
      {
        id: "A",
        label: "Standard Fine + Support Plan",
        summaryKid: "Use normal fine and also help the player improve.",
        summaryFrontOffice:
          "Apply standard discipline and attach measurable support protocol.",
        capDeltaM: -0.2,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: 0,
          player_relations: 2,
          franchise_value_growth: 2,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Harsh Public Penalty",
        summaryKid: "Big punishment in public.",
        summaryFrontOffice:
          "Escalate penalty and issue firm public discipline statement.",
        capDeltaM: 0.1,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: -1,
          flexibility: 0,
          player_relations: -4,
          franchise_value_growth: 1,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Internal Warning Only",
        summaryKid: "Keep it private and light.",
        summaryFrontOffice:
          "Issue internal warning and avoid formal public penalty.",
        capDeltaM: 0.3,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: 1,
          player_relations: 1,
          franchise_value_growth: -2,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
];

const OWNER_MISSIONS = [
  {
    id: "OWNER-001",
    role: "OWNER",
    zone: "OWNER_SUITE_FLOOR",
    urgency: "normal",
    title: "Stadium Revenue Allocation",
    description:
      "Decide where to allocate new business revenue: facilities, marketing, or debt reduction.",
    hints: {
      rookie: "Try choices that help team quality and long-term value together.",
      pro: "Measure short-term cap comfort versus growth upside.",
      legend: "Treat capital allocation as a portfolio decision.",
    },
    options: [
      {
        id: "A",
        label: "Facility + Sports Science Upgrade",
        summaryKid: "Invest in better training and health tools.",
        summaryFrontOffice:
          "Cap-ex focused facility and performance stack upgrades.",
        capDeltaM: -1.8,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: -1,
          roster_strength: 2,
          flexibility: 0,
          player_relations: 2,
          franchise_value_growth: 3,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Debt Reduction Priority",
        summaryKid: "Pay bills first to be safer later.",
        summaryFrontOffice:
          "Conservative balance-sheet allocation to reduce financing pressure.",
        capDeltaM: 1.1,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 2,
          roster_strength: -1,
          flexibility: 2,
          player_relations: 0,
          franchise_value_growth: 1,
        },
        citationIds: ["nfl_cba_index"],
      },
      {
        id: "C",
        label: "Big Market Campaign",
        summaryKid: "Spend on brand and fan excitement.",
        summaryFrontOffice:
          "Aggressive commercial campaign for sponsor and fan growth.",
        capDeltaM: -2.9,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: -1,
          roster_strength: 0,
          flexibility: -1,
          player_relations: 1,
          franchise_value_growth: 4,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "OWNER-002",
    role: "OWNER",
    zone: "BOARDROOM_FLOOR",
    urgency: "deadline",
    title: "Trade Approval Window",
    description:
      "A major trade package needs owner approval before the deadline.",
    hints: {
      rookie: "A balanced offer is safer than all-in risk.",
      pro: "Protect flexibility while adding enough roster value.",
      legend: "Only approve if risk-adjusted upside beats opportunity cost.",
    },
    options: [
      {
        id: "A",
        label: "Approve Balanced Trade",
        summaryKid: "Good upgrade without spending everything.",
        summaryFrontOffice:
          "Approve mid-risk package with manageable cap and asset cost.",
        capDeltaM: -5.4,
        deadCapDeltaM: 2.2,
        metricDeltas: {
          cap_health: -3,
          roster_strength: 5,
          flexibility: -2,
          player_relations: 2,
          franchise_value_growth: 2,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Decline and Keep Picks",
        summaryKid: "Stay patient and keep future assets.",
        summaryFrontOffice:
          "Decline trade to preserve cap room and draft capital.",
        capDeltaM: 0.7,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 1,
          roster_strength: -2,
          flexibility: 3,
          player_relations: -1,
          franchise_value_growth: 0,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Approve All-In Blockbuster",
        summaryKid: "Huge move now, risky later.",
        summaryFrontOffice:
          "Authorize aggressive package with major cap and future flexibility costs.",
        capDeltaM: -14.8,
        deadCapDeltaM: 5.4,
        metricDeltas: {
          cap_health: -10,
          roster_strength: 8,
          flexibility: -8,
          player_relations: 2,
          franchise_value_growth: 4,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "OWNER-003",
    role: "OWNER",
    zone: "OWNER_SUITE_FLOOR",
    urgency: "normal",
    title: "Headcount and Analytics Budget",
    description:
      "You can fund scouting/analytics expansion, hold budget flat, or cut costs.",
    hints: {
      rookie: "Smart support teams can help decisions all year.",
      pro: "Look at flexibility and long-term value together.",
      legend: "Treat this as compounding edge, not one-year ROI only.",
    },
    options: [
      {
        id: "A",
        label: "Expand Analytics Team",
        summaryKid: "Hire experts to make better decisions.",
        summaryFrontOffice:
          "Incremental operating spend to improve valuation and decision quality.",
        capDeltaM: -1.2,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 1,
          flexibility: 1,
          player_relations: 1,
          franchise_value_growth: 3,
        },
        citationIds: ["nfl_cba_index"],
      },
      {
        id: "B",
        label: "Hold Flat",
        summaryKid: "Keep budget the same.",
        summaryFrontOffice: "Neutral budget posture with no new operating commitments.",
        capDeltaM: 0,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 0,
          flexibility: 0,
          player_relations: 0,
          franchise_value_growth: 0,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Cut Support Staff",
        summaryKid: "Save money now but reduce support.",
        summaryFrontOffice:
          "Cost-control move that may reduce organizational decision quality.",
        capDeltaM: 1.8,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 2,
          roster_strength: -2,
          flexibility: 1,
          player_relations: -2,
          franchise_value_growth: -2,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
  {
    id: "OWNER-004",
    role: "OWNER",
    zone: "BOARDROOM_FLOOR",
    urgency: "deadline",
    title: "Franchise Value Strategy Call",
    description:
      "Choose a late-cycle strategy to maximize long-term franchise value before annual reporting.",
    hints: {
      rookie: "Balanced growth usually beats extreme risk.",
      pro: "Keep legal confidence strong while increasing value.",
      legend: "Protect downside tails while chasing upside multiple expansion.",
    },
    options: [
      {
        id: "A",
        label: "Balanced Growth Plan",
        summaryKid: "Grow carefully without huge risk.",
        summaryFrontOffice:
          "Blend conservative finance, fan growth, and roster continuity.",
        capDeltaM: -0.6,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 0,
          roster_strength: 1,
          flexibility: 1,
          player_relations: 1,
          franchise_value_growth: 3,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "B",
        label: "Risky Premium Expansion",
        summaryKid: "Big growth bet with bigger downside.",
        summaryFrontOffice:
          "High-risk valuation push with notable operational volatility.",
        capDeltaM: -4.6,
        deadCapDeltaM: 0.8,
        metricDeltas: {
          cap_health: -3,
          roster_strength: 2,
          flexibility: -2,
          player_relations: 0,
          franchise_value_growth: 5,
        },
        citationIds: ["nfl_ops_rules"],
      },
      {
        id: "C",
        label: "Defensive Capital Preservation",
        summaryKid: "Very safe money plan with slower growth.",
        summaryFrontOffice:
          "Capital preservation with reduced risk appetite and limited expansion.",
        capDeltaM: 1.5,
        deadCapDeltaM: 0,
        metricDeltas: {
          cap_health: 2,
          roster_strength: -1,
          flexibility: 2,
          player_relations: 0,
          franchise_value_growth: -1,
        },
        citationIds: ["nfl_ops_rules"],
      },
    ],
    citationIds: ["nfl_ops_rules"],
  },
];

const DIFFICULTY_ROLE_COUNT = {
  ROOKIE: 2,
  PRO: 3,
  LEGEND: 4,
};

function validateDifficulty(difficulty) {
  if (!DIFFICULTY_ROLE_COUNT[difficulty]) {
    throw new Error(`Unknown difficulty: ${difficulty}`);
  }
}

function deriveOptionTuningTags(option) {
  const tags = [];
  if (option.capDeltaM <= -4 || option.deadCapDeltaM >= 4) {
    tags.push("cap-risk");
  }
  if ((option.metricDeltas.player_relations ?? 0) <= -2) {
    tags.push("trust-risk");
  }
  if ((option.metricDeltas.flexibility ?? 0) <= -2) {
    tags.push("flexibility-risk");
  }
  if (tags.length === 0) {
    tags.push("stable-profile");
  }
  return tags;
}

function cloneMission(mission) {
  const cloned = JSON.parse(JSON.stringify(mission));
  cloned.options = cloned.options.map((option) => ({
    ...option,
    tuningTags: option.tuningTags ?? deriveOptionTuningTags(option),
  }));
  return cloned;
}

const FUTURE_PACK_MISSIONS = [
  {
    id: "AGENT-005",
    role: "AGENT",
    zone: "CONTRACT_ROW",
    urgency: "normal",
    title: "Backlog: Complex Incentive Ladder",
    description: "Future pack placeholder mission for advanced incentive structures.",
    learningObjective:
      "Model incentive ladders and upside/downside cap scenarios before final guarantees.",
    status: "BACKLOG_ONLY",
  },
  {
    id: "LEAGUE-005",
    role: "LEAGUE_OFFICE",
    zone: "LEAGUE_OFFICE_FLOOR",
    urgency: "normal",
    title: "Backlog: Compliance Appeal Window",
    description: "Future pack placeholder mission for compliance response strategy.",
    learningObjective:
      "Practice evidence-based league communication and risk-managed response timing.",
    status: "BACKLOG_ONLY",
  },
  {
    id: "OWNER-005",
    role: "OWNER",
    zone: "BOARDROOM_FLOOR",
    urgency: "deadline",
    title: "Backlog: Franchise Debt Structure Decision",
    description: "Future pack placeholder mission for ownership-level capital strategy.",
    learningObjective:
      "Compare growth financing options while protecting cap stability and team trust.",
    status: "BACKLOG_ONLY",
  },
];

export function getAllMissions() {
  return [...AGENT_MISSIONS, ...LEAGUE_OFFICE_MISSIONS, ...OWNER_MISSIONS].map(
    cloneMission,
  );
}

export function buildMissionPlan(difficulty) {
  validateDifficulty(difficulty);
  const count = DIFFICULTY_ROLE_COUNT[difficulty];
  const plan = [
    ...AGENT_MISSIONS.slice(0, count),
    ...LEAGUE_OFFICE_MISSIONS.slice(0, count),
    ...OWNER_MISSIONS.slice(0, count),
  ];
  return plan.map(cloneMission);
}

export function getRoleMissionCounts(difficulty) {
  validateDifficulty(difficulty);
  return {
    AGENT: DIFFICULTY_ROLE_COUNT[difficulty],
    LEAGUE_OFFICE: DIFFICULTY_ROLE_COUNT[difficulty],
    OWNER: DIFFICULTY_ROLE_COUNT[difficulty],
  };
}

export function getFuturePackMissions() {
  return FUTURE_PACK_MISSIONS.map((mission) => ({ ...mission }));
}
