import { evaluateRunGates } from "./nfl_rules.js";

const METRIC_ORDER = [
  "cap_health",
  "roster_strength",
  "flexibility",
  "player_relations",
  "franchise_value_growth",
];

const METRIC_TEXT = {
  cap_health: {
    kid: "You are getting close to running out of safe money space.",
    front: "Cap health is trending down. Prefer options that preserve current-year cap and avoid dead-cap spikes.",
  },
  roster_strength: {
    kid: "Your team talent score is dropping.",
    front: "Roster strength is softening. Protect impact positions while avoiding panic overpay.",
  },
  flexibility: {
    kid: "Future choices are getting tighter.",
    front: "Flexibility is shrinking. Avoid stacking guarantees that reduce next-year decision room.",
  },
  player_relations: {
    kid: "Player trust is slipping.",
    front: "Relations are under pressure. Balance cap discipline with communication and fair structure.",
  },
  franchise_value_growth: {
    kid: "Business growth is slowing down.",
    front: "Franchise value momentum is cooling. Favor stable growth over short-term noise.",
  },
};

function recentRows(state, count = 4) {
  return state.runLog.slice(Math.max(0, state.runLog.length - count));
}

function weakestMetric(metrics) {
  let key = METRIC_ORDER[0];
  for (const metric of METRIC_ORDER) {
    if (metrics[metric] < metrics[key]) {
      key = metric;
    }
  }
  return key;
}

function hasRecentLegalFail(state) {
  return recentRows(state).some((row) => row.legal === false || row.legal === "false");
}

function hasWeakMargin(gates) {
  return gates.margin < gates.marginRequired;
}

function capStress(state) {
  return state.learner.finances.capSpaceM <= 3 || state.learner.finances.deadCapM >= 120;
}

export function getAdaptiveHint({ state, mission, lastDecision = null }) {
  const gates = evaluateRunGates(state);

  if (hasRecentLegalFail(state) || !state.legalPass) {
    return {
      trigger: "recent-legal-fail",
      kid: "Pick a safer money option next. Do not go below zero cap space.",
      frontOffice:
        "Recent legality risk detected. Prioritize cap-positive or cap-neutral options and contain dead-cap growth.",
    };
  }

  if (capStress(state)) {
    return {
      trigger: "cap-stress",
      kid: "Your money room is tight. Choose the option that protects cap safety.",
      frontOffice:
        "Cap stress is elevated. Weight cap health and flexibility over marginal short-term upgrades.",
    };
  }

  if (hasWeakMargin(gates)) {
    return {
      trigger: "ai-margin-pressure",
      kid: "You need to beat the AI by more points. Choose a stronger overall move.",
      frontOffice:
        "AI margin gate is currently behind target. Favor balanced composite gains instead of one-metric spikes.",
    };
  }

  const weakMetric = weakestMetric(state.learner.metrics);
  if (state.learner.metrics[weakMetric] < 58) {
    const text = METRIC_TEXT[weakMetric];
    return {
      trigger: `weak-${weakMetric}`,
      kid: text.kid,
      frontOffice: text.front,
    };
  }

  const fallbackByDifficulty =
    state.hintLevel === "high" ? mission.hints?.rookie : state.hintLevel === "low" ? mission.hints?.legend : mission.hints?.pro;

  return {
    trigger: "difficulty-default",
    kid: fallbackByDifficulty ?? "Pick the option that keeps balance across money, talent, and trust.",
    frontOffice:
      "Run a quick tradeoff check: cap effect, dead-cap effect, and net composite impact before locking the decision.",
  };
}
