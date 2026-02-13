import { createAudioController } from "./audio.js";
import { renderHUD } from "./hud.js";
import { getAdaptiveHint } from "./nfl_hints.js";
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
import { getTeamFieldCitations, listTeams } from "./nfl_teams.js";
import { downloadRunCsv, openDecisionModal, openFormulaBreakdownModal } from "./modal.js";
import { initWorld3D } from "./world3d.js";

const dom = {
  lockDateChip: document.getElementById("lockDateChip"),
  snapshotChip: document.getElementById("snapshotChip"),
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
let lastDecision = null;

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

function citationMarkup(citations) {
  if (!citations || citations.length === 0) {
    return "";
  }
  return citations
    .map((citation) => {
      return `<a class=\"citation-pill\" href=\"${escapeHtml(citation.url)}\" target=\"_blank\" rel=\"noreferrer noopener\" title=\"${escapeHtml(citation.label)}\">src</a>`;
    })
    .join(" ");
}

function populateSetupOptions() {
  for (const team of teams) {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.displayName;
    dom.teamSelect.appendChild(option);
  }
  dom.lockDateChip.textContent = `Data Lock: ${DATA_LOCK_DATE}`;
  if (dom.snapshotChip) {
    dom.snapshotChip.textContent = "Snapshot: OTC Texture 2025 (Frozen)";
  }
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
  const missionCitations = citationMarkup(getTeamFieldCitations(state.learner.teamId, "transactionRules"));

  dom.missionMeta.innerHTML = `
    <div class="meta-chip">Mission ID: ${mission.id}</div>
    <div class="meta-chip">Role: ${mission.role}</div>
    <div class="meta-chip">Zone: ${mission.zone}</div>
    <div class="meta-chip">Urgency: ${mission.urgency}</div>
    <div class="mission-line"><strong>${escapeHtml(mission.title)}</strong> ${missionCitations}</div>
    <div class="small">${escapeHtml(mission.description)}</div>
    <div class="mission-line small">${deadlineText}</div>
  `;

  world.setMission(mission);
}

function summarizeRoleOutcomes(runLog) {
  const roles = ["AGENT", "LEAGUE_OFFICE", "OWNER"];
  const summary = {};

  for (const role of roles) {
    const rows = runLog.filter((row) => row.role === role);
    const legalCount = rows.filter((row) => row.legal === true || row.legal === "true").length;
    const avgComposite =
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((sum, row) => sum + Number(row.composite_after ?? 0), 0) / rows.length);
    summary[role] = {
      count: rows.length,
      legalCount,
      illegalCount: rows.length - legalCount,
      avgComposite,
    };
  }

  return summary;
}

function renderResults(result) {
  const learner = result.learnerMetrics;
  const ai = result.aiMetrics;
  const roleSummary = summarizeRoleOutcomes(state.runLog);
  const modelCitations = citationMarkup(getTeamFieldCitations(state.learner.teamId, "compositeModel"));
  const financeCitations = citationMarkup(getTeamFieldCitations(state.learner.teamId, "capSpaceM"));
  const summaryRow = state.runLog.find((row) => row.role === "SUMMARY");

  dom.resultsBody.innerHTML = `
    <section class="print-section">
      <h3>Run Outcome</h3>
      <div class="mission-line"><strong>Clear Status:</strong> ${result.cleared ? "CLEAR" : "NOT CLEAR"}</div>
      <div class="mission-line"><strong>Legal Gate:</strong> ${result.legalGate ? "PASS" : "FAIL"}</div>
      <div class="mission-line"><strong>Difficulty Gate:</strong> ${result.difficultyGate ? "PASS" : "FAIL"}</div>
      <div class="mission-line"><strong>AI Margin Gate:</strong> ${result.aiMarginGate ? "PASS" : "FAIL"}</div>
      <div class="mission-line"><strong>Learner Composite:</strong> ${result.learnerComposite} ${modelCitations}</div>
      <div class="mission-line"><strong>AI Composite:</strong> ${result.aiComposite} ${modelCitations}</div>
      <div class="mission-line"><strong>Margin:</strong> ${result.margin} (need ${result.marginRequired}) ${modelCitations}</div>
      <div class="mission-line"><strong>XP Awarded:</strong> ${result.xpAwarded}</div>
      <div class="mission-line"><strong>Claim Code:</strong> ${result.claimCode ?? "Not issued (run not cleared)"}</div>
      <div class="mission-line"><strong>Teacher Checksum:</strong> ${summaryRow?.review_checksum ?? "pending"}</div>
    </section>

    <section class="print-section">
      <h3>Per-Role Summary</h3>
      <div class="formula-line"><strong>Agent:</strong> decisions ${roleSummary.AGENT.count}, legal ${roleSummary.AGENT.legalCount}, illegal ${roleSummary.AGENT.illegalCount}, avg composite ${roleSummary.AGENT.avgComposite}</div>
      <div class="formula-line"><strong>League Office:</strong> decisions ${roleSummary.LEAGUE_OFFICE.count}, legal ${roleSummary.LEAGUE_OFFICE.legalCount}, illegal ${roleSummary.LEAGUE_OFFICE.illegalCount}, avg composite ${roleSummary.LEAGUE_OFFICE.avgComposite}</div>
      <div class="formula-line"><strong>Owner:</strong> decisions ${roleSummary.OWNER.count}, legal ${roleSummary.OWNER.legalCount}, illegal ${roleSummary.OWNER.illegalCount}, avg composite ${roleSummary.OWNER.avgComposite}</div>
    </section>

    <section class="print-section">
      <h3>Final Metrics</h3>
      <div class="formula-line">
        <strong>Final Metrics (Learner):</strong><br />
        cap_health ${learner.cap_health}, roster_strength ${learner.roster_strength}, flexibility ${learner.flexibility}, player_relations ${learner.player_relations}, franchise_value_growth ${learner.franchise_value_growth} ${modelCitations}
      </div>
      <div class="formula-line">
        <strong>Final Metrics (AI):</strong><br />
        cap_health ${ai.cap_health}, roster_strength ${ai.roster_strength}, flexibility ${ai.flexibility}, player_relations ${ai.player_relations}, franchise_value_growth ${ai.franchise_value_growth} ${modelCitations}
      </div>
      <div class="formula-line">
        <strong>Final Financials (Learner):</strong>
        cap space ${state.learner.finances.capSpaceM.toFixed(1)}M, dead cap ${state.learner.finances.deadCapM.toFixed(1)}M ${financeCitations}
      </div>
    </section>
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
  lastDecision = null;

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
    const hintBlock = getAdaptiveHint({ state, mission, lastDecision });
    const roleCitations = getTeamFieldCitations(state.learner.teamId, "transactionRules");

    const optionId = await openDecisionModal(mission, {
      hintLevel: state.hintLevel,
      hintBlock,
      roleCitations,
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
      formulaCitations: getTeamFieldCitations(state.learner.teamId, "compositeModel"),
      capCitations: getTeamFieldCitations(state.learner.teamId, "capSpaceM"),
    });

    lastDecision = {
      missionId: mission.id,
      optionId,
      legal: result.legality.legal,
      margin: gates.margin,
    };

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
  lastDecision = null;
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
