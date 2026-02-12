import { createAudioController } from "./audio.js";
import { renderHUD } from "./hud.js";
import {
  applyNFLAIChoice,
  applyNFLMissionOption,
  createNFLInitialState,
  finishNFLRun,
  getCurrentNFLMission,
  maybeInjectNFLEvent,
} from "./nfl_game.js";
import { evaluateRunGates } from "./nfl_rules.js";
import { DATA_LOCK_DATE, listAllCitations } from "./nfl_sources.js";
import { listTeams } from "./nfl_teams.js";
import { downloadRunCsv, openDecisionModal, openFormulaBreakdownModal } from "./modal.js";
import { initWorld3D } from "./world3d.js";

const dom = {
  lockDateChip: document.getElementById("lockDateChip"),
  teamSelect: document.getElementById("teamSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  seedInput: document.getElementById("seedInput"),
  startRunButton: document.getElementById("startRunButton"),
  setupPanel: document.getElementById("setupPanel"),
  missionPanel: document.getElementById("missionPanel"),
  missionMeta: document.getElementById("missionMeta"),
  openMissionButton: document.getElementById("openMissionButton"),
  newRunButton: document.getElementById("newRunButton"),
  resultsPanel: document.getElementById("resultsPanel"),
  resultsBody: document.getElementById("resultsBody"),
  downloadCsvButton: document.getElementById("downloadCsvButton"),
  sourceList: document.getElementById("sourceList"),
  toaster: document.getElementById("toaster"),
  worldCanvas: document.getElementById("worldCanvas"),
};

const teams = listTeams();
const audio = createAudioController();
const world = initWorld3D(dom.worldCanvas, {});

let state = null;
let toastTimeout = null;

function showToast(message) {
  if (!dom.toaster) {
    return;
  }
  dom.toaster.innerHTML = `<div class=\"toast\">${message}</div>`;
  if (toastTimeout) {
    window.clearTimeout(toastTimeout);
  }
  toastTimeout = window.setTimeout(() => {
    dom.toaster.innerHTML = "";
  }, 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateSetupOptions() {
  for (const team of teams) {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.displayName;
    dom.teamSelect.appendChild(option);
  }
  dom.lockDateChip.textContent = `Data Lock: ${DATA_LOCK_DATE}`;
}

function renderSourcePanel() {
  const citations = listAllCitations();
  dom.sourceList.innerHTML = citations
    .map((citation) => {
      return `
      <article class="source-item">
        <div><strong>${escapeHtml(citation.label)}</strong></div>
        <div class="small">Field group: ${escapeHtml(citation.fieldGroup)}</div>
        <a href="${escapeHtml(citation.url)}" target="_blank" rel="noreferrer noopener">Open source link</a>
      </article>
    `;
    })
    .join("");
}

function refreshStartButton() {
  const ready = dom.teamSelect.value !== "" && dom.difficultySelect.value !== "";
  dom.startRunButton.disabled = !ready;
}

function renderMissionMeta() {
  if (!state) {
    dom.missionMeta.innerHTML = "";
    return;
  }

  const mission = getCurrentNFLMission(state);
  if (!mission) {
    dom.missionMeta.innerHTML = `
      <div class="mission-line"><strong>Mission block complete.</strong> Open the results panel to review your run.</div>
    `;
    world.setMission(null);
    return;
  }

  const inFinalThird = state.currentMissionIndex >= Math.ceil((state.missionPlan.length * 2) / 3);
  const deadlineText = inFinalThird
    ? `Final-third pressure ON (x${state.difficultyConfig.deadlinePressureMultiplier})`
    : "Normal pressure";

  dom.missionMeta.innerHTML = `
    <div class="meta-chip">Mission ID: ${mission.id}</div>
    <div class="meta-chip">Role: ${mission.role}</div>
    <div class="meta-chip">Zone: ${mission.zone}</div>
    <div class="meta-chip">Urgency: ${mission.urgency}</div>
    <div class="mission-line"><strong>${escapeHtml(mission.title)}</strong></div>
    <div class="small">${escapeHtml(mission.description)}</div>
    <div class="mission-line small">${deadlineText}</div>
  `;

  world.setMission(mission);
}

function renderResults(result) {
  const learner = result.learnerMetrics;
  const ai = result.aiMetrics;

  dom.resultsBody.innerHTML = `
    <div class="mission-line"><strong>Clear Status:</strong> ${result.cleared ? "CLEAR" : "NOT CLEAR"}</div>
    <div class="mission-line"><strong>Legal Gate:</strong> ${result.legalGate ? "PASS" : "FAIL"}</div>
    <div class="mission-line"><strong>Difficulty Gate:</strong> ${result.difficultyGate ? "PASS" : "FAIL"}</div>
    <div class="mission-line"><strong>AI Margin Gate:</strong> ${result.aiMarginGate ? "PASS" : "FAIL"}</div>
    <div class="mission-line"><strong>Learner Composite:</strong> ${result.learnerComposite}</div>
    <div class="mission-line"><strong>AI Composite:</strong> ${result.aiComposite}</div>
    <div class="mission-line"><strong>Margin:</strong> ${result.margin} (need ${result.marginRequired})</div>
    <div class="mission-line"><strong>XP Awarded:</strong> ${result.xpAwarded}</div>
    <div class="mission-line"><strong>Claim Code:</strong> ${result.claimCode ?? "Not issued (run not cleared)"}</div>
    <div class="formula-line">
      <strong>Final Metrics (Learner):</strong><br />
      cap_health ${learner.cap_health}, roster_strength ${learner.roster_strength}, flexibility ${learner.flexibility}, player_relations ${learner.player_relations}, franchise_value_growth ${learner.franchise_value_growth}
    </div>
    <div class="formula-line">
      <strong>Final Metrics (AI):</strong><br />
      cap_health ${ai.cap_health}, roster_strength ${ai.roster_strength}, flexibility ${ai.flexibility}, player_relations ${ai.player_relations}, franchise_value_growth ${ai.franchise_value_growth}
    </div>
  `;

  dom.resultsPanel.classList.remove("hidden");
}

function startRun() {
  const learnerTeamId = dom.teamSelect.value;
  const difficulty = dom.difficultySelect.value;
  if (!learnerTeamId || !difficulty) {
    showToast("Pick team + difficulty first.");
    return;
  }

  const seedRaw = dom.seedInput.value.trim();
  const parsedSeed = seedRaw === "" ? Date.now() : Number(seedRaw);

  state = createNFLInitialState({
    learnerTeamId,
    difficulty,
    seed: Number.isFinite(parsedSeed) ? parsedSeed : Date.now(),
  });

  world.setTeam(state.learner.teamId);
  renderMissionMeta();
  renderHUD(state);

  dom.missionPanel.classList.remove("hidden");
  dom.resultsPanel.classList.add("hidden");
  dom.openMissionButton.disabled = false;

  showToast(`Run started: ${state.runId}`);
}

async function handleMissionDecision() {
  if (!state || state.finished) {
    return;
  }

  const mission = getCurrentNFLMission(state);
  if (!mission) {
    finalizeRun();
    return;
  }

  dom.openMissionButton.disabled = true;

  try {
    const optionId = await openDecisionModal(mission, {
      hintLevel: state.hintLevel,
    });

    if (!optionId) {
      dom.openMissionButton.disabled = false;
      return;
    }

    audio.play("select");

    const result = applyNFLMissionOption(state, mission.id, optionId);
    applyNFLAIChoice(state);

    if (result.legality.legal) {
      audio.play("legal");
    } else {
      audio.play("fail");
    }

    const event = maybeInjectNFLEvent(state);
    if (event) {
      showToast(`Random event: ${event.title}`);
    }

    const gates = evaluateRunGates(state);

    renderHUD(state);

    await openFormulaBreakdownModal({
      option: result.option,
      legality: result.legality,
      afterMetrics: state.learner.metrics,
      afterComposite: state.learner.composite,
      aiComposite: state.ai.composite,
      margin: gates.margin,
      marginRequired: gates.marginRequired,
      event,
    });

    if (state.currentMissionIndex >= state.missionPlan.length) {
      finalizeRun();
      return;
    }

    renderMissionMeta();
    dom.openMissionButton.disabled = false;
  } catch (error) {
    console.error(error);
    showToast(`Decision failed: ${error.message}`);
    dom.openMissionButton.disabled = false;
  }
}

function finalizeRun() {
  if (!state || state.finished) {
    return;
  }

  const result = finishNFLRun(state);
  renderHUD(state);
  renderMissionMeta();
  renderResults(result);

  dom.openMissionButton.disabled = true;

  if (result.cleared) {
    audio.play("clear");
    showToast(`Run clear. Claim code: ${result.claimCode}`);
  } else {
    audio.play("fail");
    showToast("Run complete. Review gates and retry.");
  }
}

function resetAttempt() {
  state = null;
  dom.resultsPanel.classList.add("hidden");
  dom.missionPanel.classList.add("hidden");
  dom.openMissionButton.disabled = false;
  world.setMission(null);
  renderHUD(null);
  showToast("Ready for a new attempt.");
}

function init() {
  populateSetupOptions();
  renderSourcePanel();
  refreshStartButton();

  dom.teamSelect.addEventListener("change", refreshStartButton);
  dom.difficultySelect.addEventListener("change", refreshStartButton);
  dom.startRunButton.addEventListener("click", startRun);
  dom.openMissionButton.addEventListener("click", handleMissionDecision);
  dom.newRunButton.addEventListener("click", resetAttempt);
  dom.downloadCsvButton.addEventListener("click", () => {
    if (!state || state.runLog.length === 0) {
      showToast("No run data to export yet.");
      return;
    }
    const fileName = `nfl-capital-run-${state.runId}.csv`;
    downloadRunCsv(state.runLog, fileName);
    showToast("CSV downloaded.");
  });
}

init();
