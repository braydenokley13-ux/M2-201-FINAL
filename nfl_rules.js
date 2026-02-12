export const METRIC_KEYS = [
  "cap_health",
  "roster_strength",
  "flexibility",
  "player_relations",
  "franchise_value_growth",
];

export const DIFFICULTY_CONFIG = {
  ROOKIE: {
    missionCount: 6,
    eventCount: 2,
    deadlinePressureMultiplier: 1.0,
    aiMarginRequired: 0,
    xpBase: 50,
    minComposite: 60,
    minCapHealth: null,
    minAnyMetric: null,
    hintLevel: "high",
    aiStyle: "conservative",
  },
  PRO: {
    missionCount: 9,
    eventCount: 3,
    deadlinePressureMultiplier: 1.25,
    aiMarginRequired: 3,
    xpBase: 100,
    minComposite: 70,
    minCapHealth: 55,
    minAnyMetric: null,
    hintLevel: "medium",
    aiStyle: "balanced",
  },
  LEGEND: {
    missionCount: 12,
    eventCount: 4,
    deadlinePressureMultiplier: 1.5,
    aiMarginRequired: 5,
    xpBase: 150,
    minComposite: 80,
    minCapHealth: null,
    minAnyMetric: 50,
    hintLevel: "low",
    aiStyle: "aggressive",
  },
};

export const CAP_MIN_LIMIT_M = 0;
export const DEAD_CAP_SOFT_LIMIT_M = 85;

export function getDifficultyConfig(difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  if (!config) {
    throw new Error(`Unknown difficulty: ${difficulty}`);
  }
  return config;
}

function roundTenth(value) {
  return Math.round(value * 10) / 10;
}

function clampMetric(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function cloneMetrics(metrics) {
  return {
    cap_health: metrics.cap_health,
    roster_strength: metrics.roster_strength,
    flexibility: metrics.flexibility,
    player_relations: metrics.player_relations,
    franchise_value_growth: metrics.franchise_value_growth,
  };
}

export function applyMetricDeltas(metrics, deltas) {
  const next = cloneMetrics(metrics);
  for (const metric of METRIC_KEYS) {
    next[metric] = clampMetric(next[metric] + (deltas[metric] ?? 0));
  }
  return next;
}

export function applyFinancialDeltas(finances, { capDeltaM = 0, deadCapDeltaM = 0 }) {
  return {
    capSpaceM: roundTenth(finances.capSpaceM + capDeltaM),
    deadCapM: roundTenth(finances.deadCapM + deadCapDeltaM),
  };
}

export function checkNFLMoveLegality(finances, option) {
  const projected = applyFinancialDeltas(finances, option);
  const reasons = [];
  if (projected.capSpaceM < CAP_MIN_LIMIT_M) {
    reasons.push("Projected cap space drops below zero.");
  }
  if (projected.deadCapM > DEAD_CAP_SOFT_LIMIT_M) {
    reasons.push("Projected dead cap exceeds classroom soft limit.");
  }
  return {
    legal: reasons.length === 0,
    reasons,
    projected,
  };
}

export function calculateComposite(metrics) {
  return Math.round(
    metrics.cap_health * 0.25 +
      metrics.roster_strength * 0.2 +
      metrics.flexibility * 0.2 +
      metrics.player_relations * 0.15 +
      metrics.franchise_value_growth * 0.2,
  );
}

export function compositeFormulaString(metrics) {
  return [
    "composite = round(",
    `${metrics.cap_health}*0.25 + `,
    `${metrics.roster_strength}*0.20 + `,
    `${metrics.flexibility}*0.20 + `,
    `${metrics.player_relations}*0.15 + `,
    `${metrics.franchise_value_growth}*0.20`,
    ")",
  ].join("");
}

export function evaluateRunGates(state) {
  const config = getDifficultyConfig(state.difficulty);
  const learnerComposite = calculateComposite(state.learner.metrics);
  const aiComposite = calculateComposite(state.ai.metrics);
  const margin = learnerComposite - aiComposite;

  const legalGate = state.legalPass;
  let difficultyGate = learnerComposite >= config.minComposite;
  const checks = {
    minComposite: learnerComposite >= config.minComposite,
    minCapHealth: true,
    minAnyMetric: true,
  };

  if (config.minCapHealth !== null) {
    checks.minCapHealth = state.learner.metrics.cap_health >= config.minCapHealth;
    difficultyGate = difficultyGate && checks.minCapHealth;
  }

  if (config.minAnyMetric !== null) {
    checks.minAnyMetric = METRIC_KEYS.every(
      (metric) => state.learner.metrics[metric] >= config.minAnyMetric,
    );
    difficultyGate = difficultyGate && checks.minAnyMetric;
  }

  const aiMarginGate = margin >= config.aiMarginRequired;
  const cleared = legalGate && difficultyGate && aiMarginGate;

  return {
    legalGate,
    difficultyGate,
    aiMarginGate,
    cleared,
    margin,
    marginRequired: config.aiMarginRequired,
    learnerComposite,
    aiComposite,
    checks,
  };
}

export function applyDeadlinePressure(option, multiplier) {
  if (multiplier === 1) {
    return {
      capDeltaM: option.capDeltaM,
      deadCapDeltaM: option.deadCapDeltaM,
      metricDeltas: { ...option.metricDeltas },
    };
  }
  const adjustedMetrics = {};
  for (const metric of METRIC_KEYS) {
    const value = option.metricDeltas[metric] ?? 0;
    adjustedMetrics[metric] = value < 0 ? Math.round(value * multiplier) : value;
  }
  return {
    capDeltaM: option.capDeltaM < 0 ? roundTenth(option.capDeltaM * multiplier) : option.capDeltaM,
    deadCapDeltaM:
      option.deadCapDeltaM > 0
        ? roundTenth(option.deadCapDeltaM * multiplier)
        : option.deadCapDeltaM,
    metricDeltas: adjustedMetrics,
  };
}

export function createMetricDeltaRow(base = {}) {
  return {
    cap_health: base.cap_health ?? 0,
    roster_strength: base.roster_strength ?? 0,
    flexibility: base.flexibility ?? 0,
    player_relations: base.player_relations ?? 0,
    franchise_value_growth: base.franchise_value_growth ?? 0,
  };
}
