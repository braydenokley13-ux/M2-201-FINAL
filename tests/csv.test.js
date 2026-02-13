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
import { buildRunCsvString, getCsvColumns } from "../modal.js";

function runForCsv() {
  const state = createNFLInitialState({ learnerTeamId: "KC", difficulty: "PRO", seed: 440 });

  while (true) {
    const mission = getCurrentNFLMission(state);
    if (!mission) {
      break;
    }
    applyNFLMissionOption(state, mission.id, mission.options[0].id);
    applyNFLAIChoice(state);
    maybeInjectNFLEvent(state);
  }

  finishNFLRun(state);
  return state;
}

test("CSV has required columns and row count is decisions + summary", () => {
  const state = runForCsv();
  const csv = buildRunCsvString(state.runLog);
  const lines = csv.split("\n");

  const header = lines[0].split(",").map((entry) => entry.replaceAll('"', ""));
  const required = getCsvColumns();

  for (const col of required) {
    assert.ok(header.includes(col), `missing column ${col}`);
  }

  assert.equal(lines.length - 1, state.runLog.length);
  assert.equal(state.runLog.length, state.missionPlan.length + 1);

  const summary = state.runLog[state.runLog.length - 1];
  assert.equal(summary.role, "SUMMARY");
  assert.ok(summary.review_checksum.startsWith("CHK-"));
});
