import {
  applyNFLAIChoice,
  applyNFLMissionOption,
  createNFLInitialState,
  finishNFLRun,
  getCurrentNFLMission,
  maybeInjectNFLEvent,
} from "../nfl_game.js";
import { checkNFLMoveLegality } from "../nfl_rules.js";

function scoreOption(option, state, difficulty) {
  const legal = checkNFLMoveLegality(state.learner.finances, option).legal;
  if (!legal) {
    return -9999;
  }

  const d = option.metricDeltas;
  const base =
    d.cap_health * 0.28 +
    d.roster_strength * 0.2 +
    d.flexibility * 0.22 +
    d.player_relations * 0.15 +
    d.franchise_value_growth * 0.15;

  const capBias = option.capDeltaM >= 0 ? 0.6 : -0.4;

  if (difficulty === "ROOKIE") {
    return base + capBias + d.player_relations * 0.08;
  }
  if (difficulty === "LEGEND") {
    return base + d.roster_strength * 0.08 - option.deadCapDeltaM * 0.08;
  }
  return base + capBias * 0.5;
}

function chooseOption(state, mission, difficulty) {
  const scored = mission.options
    .map((option) => ({ option, score: scoreOption(option, state, difficulty) }))
    .sort((a, b) => b.score - a.score);

  // Add controlled variation so attempts are not deterministic mirror-perfect.
  const top = scored.slice(0, Math.min(scored.length, 2));
  const pickIndex = state.rng() < (difficulty === "ROOKIE" ? 0.18 : difficulty === "PRO" ? 0.28 : 0.36) ? 1 : 0;
  return (top[pickIndex] ?? top[0]).option;
}

function runSingle({ teamId, difficulty, seed }) {
  const state = createNFLInitialState({ learnerTeamId: teamId, difficulty, seed });

  while (true) {
    const mission = getCurrentNFLMission(state);
    if (!mission) {
      break;
    }
    const option = chooseOption(state, mission, difficulty);
    applyNFLMissionOption(state, mission.id, option.id);
    applyNFLAIChoice(state);
    maybeInjectNFLEvent(state);
  }

  return finishNFLRun(state);
}

function runBatch({ difficulty, runs = 400 }) {
  let clears = 0;
  let legalFails = 0;
  let marginFails = 0;
  let difficultyFails = 0;

  for (let i = 0; i < runs; i += 1) {
    const teamId = i % 2 === 0 ? "KC" : "SF";
    const result = runSingle({ teamId, difficulty, seed: 1000 + i });
    if (result.cleared) {
      clears += 1;
    }
    if (!result.legalGate) {
      legalFails += 1;
    }
    if (!result.aiMarginGate) {
      marginFails += 1;
    }
    if (!result.difficultyGate) {
      difficultyFails += 1;
    }
  }

  return {
    difficulty,
    runs,
    clearRate: Number(((clears / runs) * 100).toFixed(2)),
    legalFailRate: Number(((legalFails / runs) * 100).toFixed(2)),
    marginFailRate: Number(((marginFails / runs) * 100).toFixed(2)),
    difficultyFailRate: Number(((difficultyFails / runs) * 100).toFixed(2)),
  };
}

const results = ["ROOKIE", "PRO", "LEGEND"].map((difficulty) => runBatch({ difficulty }));
console.log(JSON.stringify(results, null, 2));
