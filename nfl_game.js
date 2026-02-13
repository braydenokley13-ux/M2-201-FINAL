import { applyNFLAIChoice as chooseAIOption } from "./nfl_ai.js";
import { listNFLEvents } from "./nfl_events.js";
import { buildMissionPlan } from "./nfl_missions.js";
import { getTeamSnapshotById, listTeams } from "./nfl_teams.js";
import {
  applyDeadlinePressure,
  applyFinancialDeltas,
  applyMetricDeltas,
  calculateComposite,
  checkNFLMoveLegality,
  evaluateRunGates,
  getDifficultyConfig,
} from "./nfl_rules.js";

const ROLE_SEQUENCE = ["AGENT", "LEAGUE_OFFICE", "OWNER"];

function createSeededRng(seedValue) {
  let seed = Number(seedValue);
  if (!Number.isFinite(seed)) {
    seed = 201;
  }
  seed = (seed >>> 0) || 1;
  return function rng() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function pickAiTeamId(learnerTeamId) {
  const teams = listTeams();
  const other = teams.find((team) => team.id !== learnerTeamId);
  if (!other) {
    throw new Error("Missing opponent team snapshot.");
  }
  return other.id;
}

function createRunId(seed) {
  const stamp = Date.now().toString(36).toUpperCase();
  const seedPart = String(seed).replace(/[^0-9A-Z]/gi, "").slice(0, 6).toUpperCase() || "201";
  return `RUN-${stamp}-${seedPart}`;
}

function getCurrentMission(state) {
  return state.missionPlan[state.currentMissionIndex] ?? null;
}

export function getCurrentNFLMission(state) {
  return getCurrentMission(state);
}

function buildEffectiveMission(mission, multiplier, shouldApplyPressure) {
  if (!shouldApplyPressure || multiplier === 1) {
    return {
      ...mission,
      options: mission.options.map((option) => ({ ...option, metricDeltas: { ...option.metricDeltas } })),
    };
  }
  return {
    ...mission,
    options: mission.options.map((option) => {
      const adjusted = applyDeadlinePressure(option, multiplier);
      return {
        ...option,
        capDeltaM: adjusted.capDeltaM,
        deadCapDeltaM: adjusted.deadCapDeltaM,
        metricDeltas: adjusted.metricDeltas,
      };
    }),
  };
}

function balanceLearnerDecision(option, difficulty) {
  const tuning = {
    ROOKIE: {
      positiveMetric: 1.22,
      negativeMetric: 0.78,
      capGain: 1.15,
      capCost: 0.82,
      deadCapIncrease: 0.8,
    },
    PRO: {
      positiveMetric: 1.1,
      negativeMetric: 0.88,
      capGain: 1.08,
      capCost: 0.9,
      deadCapIncrease: 0.88,
    },
    LEGEND: {
      positiveMetric: 1.2,
      negativeMetric: 0.86,
      capGain: 1.08,
      capCost: 0.9,
      deadCapIncrease: 0.86,
    },
  }[difficulty];

  if (!tuning) {
    return option;
  }

  const metricDeltas = {};
  for (const [metric, rawValue] of Object.entries(option.metricDeltas)) {
    if (rawValue >= 0) {
      metricDeltas[metric] = Math.round(rawValue * tuning.positiveMetric);
    } else {
      metricDeltas[metric] = Math.round(rawValue * tuning.negativeMetric);
    }
  }

  const capDeltaM =
    option.capDeltaM >= 0
      ? Math.round(option.capDeltaM * tuning.capGain * 10) / 10
      : Math.round(option.capDeltaM * tuning.capCost * 10) / 10;

  const deadCapDeltaM =
    option.deadCapDeltaM > 0
      ? Math.round(option.deadCapDeltaM * tuning.deadCapIncrease * 10) / 10
      : option.deadCapDeltaM;

  return {
    ...option,
    capDeltaM,
    deadCapDeltaM,
    metricDeltas,
  };
}

function inFinalThird(indexZeroBased, totalMissions) {
  const firstIndex = Math.ceil((totalMissions * 2) / 3);
  return indexZeroBased >= firstIndex;
}

function flattenDeltas(metricDeltas) {
  return {
    delta_cap_health: metricDeltas.cap_health ?? 0,
    delta_roster_strength: metricDeltas.roster_strength ?? 0,
    delta_flexibility: metricDeltas.flexibility ?? 0,
    delta_player_relations: metricDeltas.player_relations ?? 0,
    delta_franchise_value_growth: metricDeltas.franchise_value_growth ?? 0,
  };
}

function gateFlagsToText(gates) {
  if (!gates) {
    return "pending";
  }
  return [
    `legal:${gates.legalGate ? "pass" : "fail"}`,
    `difficulty:${gates.difficultyGate ? "pass" : "fail"}`,
    `ai_margin:${gates.aiMarginGate ? "pass" : "fail"}`,
  ].join("|");
}

function appendDecisionRow(state, row) {
  state.runLog.push({
    timestamp: new Date().toISOString(),
    run_id: state.runId,
    difficulty: state.difficulty,
    learner_team: state.learner.teamId,
    ai_team: state.ai.teamId,
    mission_id: row.mission_id,
    role: row.role,
    option_id: row.option_id,
    legal: row.legal,
    metric_deltas: JSON.stringify(row.metric_deltas),
    cap_delta_m: row.cap_delta_m,
    dead_cap_delta_m: row.dead_cap_delta_m,
    composite_after: row.composite_after,
    gate_flags: row.gate_flags,
    cleared: row.cleared,
    claim_code: row.claim_code,
    review_checksum: row.review_checksum ?? "",
    ...flattenDeltas(row.metric_deltas),
  });
}

function computeReviewChecksum(state, gateResult) {
  const base = [
    state.runId,
    state.difficulty,
    state.learner.teamId,
    gateResult.learnerComposite,
    gateResult.aiComposite,
    gateResult.margin,
    state.eventsTriggered,
    state.legalPass ? "1" : "0",
  ].join("|");
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `CHK-${hash.toString(36).toUpperCase().padStart(6, "0")}`;
}

function createClaimCode(state, result) {
  if (!result.cleared) {
    return null;
  }
  const diff = state.difficulty;
  const team = state.learner.teamId;
  const hashBase =
    state.learnerComposite + result.margin + state.currentMissionIndex + state.eventsTriggered;
  const suffix = Math.abs(hashBase * 137 + Number(state.seed) * 17)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0")
    .slice(-3);
  return `M1-201-NFL-${diff}-${team}-${suffix}`;
}

function validateRoleOrder(missionPlan) {
  const indices = ROLE_SEQUENCE.map((role) => missionPlan.findIndex((item) => item.role === role));
  if (indices.some((idx) => idx === -1)) {
    throw new Error("Mission plan is missing one or more required roles.");
  }
  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] < indices[i - 1]) {
      throw new Error("Mission role sequence violates Agent -> League Office -> Owner order.");
    }
  }
}

/**
 * @typedef {Object} NFLRunConfig
 * @property {string} learnerTeamId
 * @property {"ROOKIE"|"PRO"|"LEGEND"} difficulty
 * @property {number|string} [seed]
 */

/**
 * @param {NFLRunConfig} config
 */
export function createNFLInitialState(config) {
  if (!config?.learnerTeamId) {
    throw new Error("learnerTeamId is required.");
  }
  if (!config?.difficulty) {
    throw new Error("difficulty is required.");
  }

  const difficultyConfig = getDifficultyConfig(config.difficulty);
  const learnerTeam = getTeamSnapshotById(config.learnerTeamId);
  if (!learnerTeam) {
    throw new Error(`Unknown team: ${config.learnerTeamId}`);
  }

  const aiTeamId = pickAiTeamId(config.learnerTeamId);
  const aiTeam = getTeamSnapshotById(aiTeamId);
  if (!aiTeam) {
    throw new Error(`Unknown AI team: ${aiTeamId}`);
  }

  const missionPlan = listNFLMissions(config.difficulty);
  validateRoleOrder(missionPlan);

  const seed = config.seed ?? 201;
  const rng = createSeededRng(seed);
  const runId = createRunId(seed);

  const state = {
    runId,
    seed,
    difficulty: config.difficulty,
    difficultyConfig,
    hintLevel: difficultyConfig.hintLevel,
    learnerTeamId: learnerTeam.id,
    aiTeamId: aiTeam.id,
    startedAtIso: new Date().toISOString(),
    finishedAtIso: null,
    missionPlan,
    currentMissionIndex: 0,
    legalPass: true,
    eventQuota: difficultyConfig.eventCount,
    eventsTriggered: 0,
    usedEventIds: [],
    eventPool: listNFLEvents(),
    runLog: [],
    eventLog: [],
    finalResult: null,
    finished: false,
    pendingTurn: null,
    rng,
    learner: {
      teamId: learnerTeam.id,
      teamName: learnerTeam.displayName,
      finances: {
        capSpaceM: learnerTeam.capSpaceM,
        deadCapM: learnerTeam.deadCapM,
      },
      metrics: { ...learnerTeam.initialMetrics },
      composite: calculateComposite(learnerTeam.initialMetrics),
      lastChoice: null,
    },
    ai: {
      teamId: aiTeam.id,
      teamName: aiTeam.displayName,
      finances: {
        capSpaceM: aiTeam.capSpaceM,
        deadCapM: aiTeam.deadCapM,
      },
      metrics: { ...aiTeam.initialMetrics },
      composite: calculateComposite(aiTeam.initialMetrics),
      lastChoice: null,
    },
  };

  state.learnerComposite = state.learner.composite;
  state.aiComposite = state.ai.composite;

  return state;
}

export function listNFLMissions(difficulty) {
  return buildMissionPlan(difficulty);
}

/**
 * @param {ReturnType<typeof createNFLInitialState>} state
 * @param {string} missionId
 * @param {string} optionId
 */
export function applyNFLMissionOption(state, missionId, optionId) {
  if (state.finished) {
    throw new Error("Run already finished.");
  }
  if (state.pendingTurn) {
    throw new Error("AI turn is pending. Call applyNFLAIChoice before next learner move.");
  }

  const mission = getCurrentMission(state);
  if (!mission) {
    throw new Error("No mission remaining.");
  }

  if (mission.id !== missionId) {
    throw new Error(`Expected mission ${mission.id}, got ${missionId}`);
  }

  const applyPressure = inFinalThird(state.currentMissionIndex, state.missionPlan.length);
  const effectiveMission = buildEffectiveMission(
    mission,
    state.difficultyConfig.deadlinePressureMultiplier,
    applyPressure,
  );

  const chosenOption = effectiveMission.options.find((option) => option.id === optionId);
  if (!chosenOption) {
    throw new Error(`Unknown option ${optionId} for mission ${missionId}`);
  }

  const tunedLearnerOption = balanceLearnerDecision(chosenOption, state.difficulty);

  const legality = checkNFLMoveLegality(state.learner.finances, tunedLearnerOption);
  state.learner.finances = legality.projected;
  state.learner.metrics = applyMetricDeltas(state.learner.metrics, tunedLearnerOption.metricDeltas);
  state.learner.composite = calculateComposite(state.learner.metrics);
  state.learnerComposite = state.learner.composite;
  state.learner.lastChoice = {
    missionId,
    optionId,
    legal: legality.legal,
    reasons: legality.reasons,
  };

  if (!legality.legal) {
    state.legalPass = false;
  }

  state.pendingTurn = {
    missionId: mission.id,
    effectiveMission,
    learnerDecision: {
      role: mission.role,
      option_id: optionId,
      legal: legality.legal,
      cap_delta_m: tunedLearnerOption.capDeltaM,
      dead_cap_delta_m: tunedLearnerOption.deadCapDeltaM,
      metric_deltas: tunedLearnerOption.metricDeltas,
      composite_after: state.learner.composite,
    },
  };

  return {
    mission,
    option: tunedLearnerOption,
    legality,
    runFinishedByProgress: state.currentMissionIndex + 1 >= state.missionPlan.length,
  };
}

/**
 * @param {ReturnType<typeof createNFLInitialState>} state
 */
export function applyNFLAIChoice(state) {
  if (state.finished) {
    throw new Error("Run already finished.");
  }
  if (!state.pendingTurn) {
    throw new Error("applyNFLMissionOption must run before applyNFLAIChoice.");
  }
  const mission = state.pendingTurn.effectiveMission;
  const aiChoice = chooseAIOption(state, mission);
  state.aiComposite = state.ai.composite;
  const decision = state.pendingTurn.learnerDecision;
  state.currentMissionIndex += 1;
  state.pendingTurn = null;

  const interimGates = evaluateRunGates(state);
  appendDecisionRow(state, {
    mission_id: mission.id,
    role: decision.role,
    option_id: decision.option_id,
    legal: decision.legal,
    cap_delta_m: decision.cap_delta_m,
    dead_cap_delta_m: decision.dead_cap_delta_m,
    metric_deltas: decision.metric_deltas,
    composite_after: decision.composite_after,
    gate_flags: gateFlagsToText(interimGates),
    cleared: "pending",
    claim_code: "",
  });

  return aiChoice;
}

/**
 * @param {ReturnType<typeof createNFLInitialState>} state
 */
export function maybeInjectNFLEvent(state) {
  if (state.finished) {
    return null;
  }

  const passedInjectionPoint = state.currentMissionIndex > 0 && state.currentMissionIndex % 3 === 0;
  if (!passedInjectionPoint) {
    return null;
  }

  if (state.eventsTriggered >= state.eventQuota) {
    return null;
  }

  const availableEvents = state.eventPool.filter((event) => !state.usedEventIds.includes(event.id));
  if (availableEvents.length === 0) {
    return null;
  }

  const eventIndex = Math.floor(state.rng() * availableEvents.length);
  const event = availableEvents[eventIndex];
  state.usedEventIds.push(event.id);
  state.eventsTriggered += 1;

  state.learner.finances = applyFinancialDeltas(state.learner.finances, {
    capDeltaM: event.capDeltaM,
    deadCapDeltaM: event.deadCapDeltaM,
  });
  state.learner.metrics = applyMetricDeltas(state.learner.metrics, event.metricDeltas);
  state.learner.composite = calculateComposite(state.learner.metrics);
  state.learnerComposite = state.learner.composite;

  // TODO(nfl-balance): Decide whether events should also affect AI for parity mode.

  state.eventLog.push({
    timestamp: new Date().toISOString(),
    mission_checkpoint: state.currentMissionIndex,
    event_id: event.id,
    event_type: event.type,
    cap_delta_m: event.capDeltaM,
    dead_cap_delta_m: event.deadCapDeltaM,
    metric_deltas: { ...event.metricDeltas },
  });

  return event;
}

/**
 * @param {ReturnType<typeof createNFLInitialState>} state
 */
export function finishNFLRun(state) {
  if (state.finished && state.finalResult) {
    return state.finalResult;
  }

  if (state.currentMissionIndex < state.missionPlan.length) {
    throw new Error("Cannot finish run before all missions are completed.");
  }

  const gateResult = evaluateRunGates(state);
  const claimCode = createClaimCode(state, gateResult);
  const reviewChecksum = computeReviewChecksum(state, gateResult);
  const xpAwarded = gateResult.cleared ? state.difficultyConfig.xpBase : 0;

  const result = {
    ...gateResult,
    xpAwarded,
    claimCode,
    difficulty: state.difficulty,
    runId: state.runId,
    missionCount: state.missionPlan.length,
    eventsTriggered: state.eventsTriggered,
    learnerMetrics: { ...state.learner.metrics },
    aiMetrics: { ...state.ai.metrics },
    reviewChecksum,
  };

  appendDecisionRow(state, {
    mission_id: "RUN_SUMMARY",
    role: "SUMMARY",
    option_id: "FINAL",
    legal: gateResult.legalGate,
    cap_delta_m: 0,
    dead_cap_delta_m: 0,
    metric_deltas: {
      cap_health: 0,
      roster_strength: 0,
      flexibility: 0,
      player_relations: 0,
      franchise_value_growth: 0,
    },
    composite_after: gateResult.learnerComposite,
    gate_flags: gateFlagsToText(gateResult),
    cleared: gateResult.cleared,
    claim_code: claimCode ?? "",
    review_checksum: reviewChecksum,
  });

  state.finished = true;
  state.finalResult = result;
  state.finishedAtIso = new Date().toISOString();

  return result;
}
