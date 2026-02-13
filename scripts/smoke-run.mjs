import {
  applyNFLAIChoice,
  applyNFLMissionOption,
  createNFLInitialState,
  finishNFLRun,
  getCurrentNFLMission,
  maybeInjectNFLEvent,
} from "../nfl_game.js";

function playRun(difficulty, teamId, seed) {
  const state = createNFLInitialState({ learnerTeamId: teamId, difficulty, seed });

  while (true) {
    const mission = getCurrentNFLMission(state);
    if (!mission) {
      break;
    }
    const option = mission.options[0];
    applyNFLMissionOption(state, mission.id, option.id);
    applyNFLAIChoice(state);
    maybeInjectNFLEvent(state);
  }

  const result = finishNFLRun(state);
  return {
    difficulty,
    missions: state.missionPlan.length,
    events: state.eventsTriggered,
    runLogRows: state.runLog.length,
    clear: result.cleared,
    claim: result.claimCode,
    xp: result.xpAwarded,
  };
}

const rows = [
  playRun("ROOKIE", "KC", 201),
  playRun("PRO", "SF", 202),
  playRun("LEGEND", "KC", 203),
];

console.log(JSON.stringify(rows, null, 2));
