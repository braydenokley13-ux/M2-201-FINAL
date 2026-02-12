import {
  applyFinancialDeltas,
  applyMetricDeltas,
  calculateComposite,
  checkNFLMoveLegality,
  getDifficultyConfig,
} from "./nfl_rules.js";

const AI_PROFILES = {
  conservative: {
    legalPenalty: -1000,
    capWeight: 0.35,
    rosterWeight: 0.2,
    flexWeight: 0.25,
    relationsWeight: 0.1,
    valueWeight: 0.1,
    noise: 1.5,
  },
  balanced: {
    legalPenalty: -700,
    capWeight: 0.24,
    rosterWeight: 0.23,
    flexWeight: 0.2,
    relationsWeight: 0.14,
    valueWeight: 0.19,
    noise: 2.4,
  },
  aggressive: {
    legalPenalty: -500,
    capWeight: 0.14,
    rosterWeight: 0.32,
    flexWeight: 0.16,
    relationsWeight: 0.12,
    valueWeight: 0.26,
    noise: 3.2,
  },
};

function optionScore(profile, legality, option, rng) {
  const deltas = option.metricDeltas;
  const weighted =
    deltas.cap_health * profile.capWeight +
    deltas.roster_strength * profile.rosterWeight +
    deltas.flexibility * profile.flexWeight +
    deltas.player_relations * profile.relationsWeight +
    deltas.franchise_value_growth * profile.valueWeight;
  const capBias = option.capDeltaM > 0 ? 0.5 : -0.3;
  const legalityBias = legality.legal ? 0 : profile.legalPenalty;
  const noise = (rng() - 0.5) * profile.noise;
  return weighted + capBias + legalityBias + noise;
}

export function applyNFLAIChoice(state, mission) {
  const config = getDifficultyConfig(state.difficulty);
  const profile = AI_PROFILES[config.aiStyle];
  const options = mission.options;
  let best = null;

  for (const option of options) {
    const legality = checkNFLMoveLegality(state.ai.finances, option);
    const score = optionScore(profile, legality, option, state.rng);
    if (!best || score > best.score) {
      best = { option, legality, score };
    }
  }

  const chosen = best.option;
  state.ai.finances = applyFinancialDeltas(state.ai.finances, chosen);
  state.ai.metrics = applyMetricDeltas(state.ai.metrics, chosen.metricDeltas);
  state.ai.composite = calculateComposite(state.ai.metrics);
  state.ai.lastChoice = {
    missionId: mission.id,
    optionId: chosen.id,
    legal: best.legality.legal,
    reasons: best.legality.reasons,
  };

  return state.ai.lastChoice;
}
