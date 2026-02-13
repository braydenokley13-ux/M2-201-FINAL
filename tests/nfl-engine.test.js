import assert from "node:assert/strict";
import test from "node:test";

import {
  applyNFLAIChoice,
  applyNFLMissionOption,
  createNFLInitialState,
  finishNFLRun,
  getCurrentNFLMission,
  maybeInjectNFLEvent,
} from "../nfl_game.js";
import { buildMissionPlan, getRoleMissionCounts } from "../nfl_missions.js";
import { evaluateRunGates, calculateComposite } from "../nfl_rules.js";
import { getTeamFieldCitations } from "../nfl_teams.js";

function runSimpleDifficulty(difficulty, teamId = "KC", seed = 123) {
  const state = createNFLInitialState({ learnerTeamId: teamId, difficulty, seed });
  while (true) {
    const mission = getCurrentNFLMission(state);
    if (!mission) {
      break;
    }
    applyNFLMissionOption(state, mission.id, mission.options[0].id);
    applyNFLAIChoice(state);
    maybeInjectNFLEvent(state);
  }
  const result = finishNFLRun(state);
  return { state, result };
}

test("mission counts and event quotas are exact for each difficulty", () => {
  const expected = {
    ROOKIE: { missions: 6, events: 2 },
    PRO: { missions: 9, events: 3 },
    LEGEND: { missions: 12, events: 4 },
  };

  for (const [difficulty, counts] of Object.entries(expected)) {
    const { state } = runSimpleDifficulty(difficulty, "KC", 210);
    assert.equal(state.missionPlan.length, counts.missions);
    assert.equal(state.eventsTriggered, counts.events);
    assert.equal(state.runLog.length, counts.missions + 1);
    const roleCounts = getRoleMissionCounts(difficulty);
    assert.equal(roleCounts.AGENT + roleCounts.LEAGUE_OFFICE + roleCounts.OWNER, counts.missions);
  }
});

test("role order is always Agent then League Office then Owner", () => {
  for (const difficulty of ["ROOKIE", "PRO", "LEGEND"]) {
    const plan = buildMissionPlan(difficulty);
    const firstLeague = plan.findIndex((m) => m.role === "LEAGUE_OFFICE");
    const firstOwner = plan.findIndex((m) => m.role === "OWNER");
    const lastAgent = plan.map((m) => m.role).lastIndexOf("AGENT");
    const lastLeague = plan.map((m) => m.role).lastIndexOf("LEAGUE_OFFICE");

    assert.ok(lastAgent < firstLeague);
    assert.ok(lastLeague < firstOwner);
  }
});

test("illegal cap action flips legal gate to fail", () => {
  const state = createNFLInitialState({ learnerTeamId: "KC", difficulty: "ROOKIE", seed: 333 });
  state.learner.finances.capSpaceM = 0.1;

  const mission = getCurrentNFLMission(state);
  applyNFLMissionOption(state, mission.id, mission.options[0].id);
  applyNFLAIChoice(state);

  const gates = evaluateRunGates(state);
  assert.equal(gates.legalGate, false);
});

test("composite formula math matches weighted model", () => {
  const metrics = {
    cap_health: 70,
    roster_strength: 80,
    flexibility: 60,
    player_relations: 75,
    franchise_value_growth: 90,
  };
  const composite = calculateComposite(metrics);
  assert.equal(composite, Math.round(70 * 0.25 + 80 * 0.2 + 60 * 0.2 + 75 * 0.15 + 90 * 0.2));
});

test("AI margin threshold rules are tie/beat, +3, +5", () => {
  const base = {
    legalPass: true,
    learner: { metrics: { cap_health: 80, roster_strength: 80, flexibility: 80, player_relations: 80, franchise_value_growth: 80 } },
    ai: { metrics: { cap_health: 80, roster_strength: 80, flexibility: 80, player_relations: 80, franchise_value_growth: 80 } },
  };

  const rookie = evaluateRunGates({ ...base, difficulty: "ROOKIE" });
  assert.equal(rookie.margin, 0);
  assert.equal(rookie.aiMarginGate, true);

  const proFail = evaluateRunGates({ ...base, difficulty: "PRO" });
  assert.equal(proFail.aiMarginGate, false);

  const proPass = evaluateRunGates({
    ...base,
    difficulty: "PRO",
    learner: { metrics: { cap_health: 83, roster_strength: 83, flexibility: 83, player_relations: 83, franchise_value_growth: 83 } },
    ai: { metrics: { cap_health: 80, roster_strength: 80, flexibility: 80, player_relations: 80, franchise_value_growth: 80 } },
  });
  assert.equal(proPass.margin >= 3, true);
  assert.equal(proPass.aiMarginGate, true);

  const legendFail = evaluateRunGates({ ...base, difficulty: "LEGEND" });
  assert.equal(legendFail.aiMarginGate, false);

  const legendPass = evaluateRunGates({
    ...base,
    difficulty: "LEGEND",
    learner: { metrics: { cap_health: 85, roster_strength: 85, flexibility: 85, player_relations: 85, franchise_value_growth: 85 } },
    ai: { metrics: { cap_health: 80, roster_strength: 80, flexibility: 80, player_relations: 80, franchise_value_growth: 80 } },
  });
  assert.equal(legendPass.margin >= 5, true);
  assert.equal(legendPass.aiMarginGate, true);
});

test("XP awards are exact 50/100/150 and claim code appears only on clear", () => {
  for (const [difficulty, xp] of [
    ["ROOKIE", 50],
    ["PRO", 100],
    ["LEGEND", 150],
  ]) {
    const state = createNFLInitialState({ learnerTeamId: "KC", difficulty, seed: 909 });
    state.currentMissionIndex = state.missionPlan.length;
    state.legalPass = true;
    state.learner.metrics = {
      cap_health: 95,
      roster_strength: 95,
      flexibility: 95,
      player_relations: 95,
      franchise_value_growth: 95,
    };
    state.ai.metrics = {
      cap_health: 70,
      roster_strength: 70,
      flexibility: 70,
      player_relations: 70,
      franchise_value_growth: 70,
    };

    const result = finishNFLRun(state);
    assert.equal(result.xpAwarded, xp);
    assert.match(result.claimCode, new RegExp(`^M1-201-NFL-${difficulty}-KC-[A-Z0-9]{3}$`));
  }

  const failState = createNFLInitialState({ learnerTeamId: "SF", difficulty: "ROOKIE", seed: 910 });
  failState.currentMissionIndex = failState.missionPlan.length;
  failState.legalPass = false;
  const failResult = finishNFLRun(failState);
  assert.equal(failResult.claimCode, null);
});

test("field-level citations exist for major displayed numeric fields", () => {
  for (const teamId of ["KC", "SF"]) {
    for (const fieldKey of ["capSpaceM", "deadCapM", "coreContracts", "compositeModel", "transactionRules"]) {
      const citations = getTeamFieldCitations(teamId, fieldKey);
      assert.ok(citations.length > 0, `${teamId} ${fieldKey} missing citations`);
    }
  }
});
