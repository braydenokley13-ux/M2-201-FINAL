import { getTeamFieldCitations } from "./nfl_teams.js";
import { evaluateRunGates } from "./nfl_rules.js";

const METRIC_LABELS = {
  cap_health: "Cap Health (money safety)",
  roster_strength: "Roster Strength (team talent)",
  flexibility: "Flexibility (future options)",
  player_relations: "Player Relations (trust)",
  franchise_value_growth: "Franchise Value Growth (business growth)",
};

function statusClass(value) {
  if (value >= 70) {
    return "ok";
  }
  if (value < 50) {
    return "bad";
  }
  return "";
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

export function renderHUD(state, root = document.getElementById("hudRoot")) {
  if (!root) {
    return;
  }

  if (!state) {
    root.innerHTML = "";
    return;
  }

  const missionTotal = state.missionPlan.length;
  const missionDone = state.currentMissionIndex;
  const currentMission = state.missionPlan[state.currentMissionIndex] ?? null;
  const gates = evaluateRunGates(state);

  const capCitations = getTeamFieldCitations(state.learner.teamId, "capSpaceM");
  const deadCapCitations = getTeamFieldCitations(state.learner.teamId, "deadCapM");
  const modelCitations = getTeamFieldCitations(state.learner.teamId, "compositeModel");

  const metrics = Object.entries(METRIC_LABELS)
    .map(([key, label]) => {
      const value = state.learner.metrics[key];
      return `<div class=\"hud-item\"><span class=\"hud-label\">${label} ${citationMarkup(modelCitations)}</span><span class=\"hud-value ${statusClass(value)}\">${value}</span></div>`;
    })
    .join("");

  root.innerHTML = `
    <div class="hud-card">
      <div>
        <strong>${state.learner.teamName}</strong> vs ${state.ai.teamName}
      </div>
      <div class="small">Difficulty: ${state.difficulty} | Run ID: ${state.runId}</div>
      <div class="small">Mission ${Math.min(missionDone + 1, missionTotal)} of ${missionTotal}${currentMission ? ` | Role: ${currentMission.role}` : " | Complete"}</div>
      <div class="hud-grid">
        <div class="hud-item"><span class="hud-label">Cap Space (M) ${citationMarkup(capCitations)}</span><span class="hud-value">${state.learner.finances.capSpaceM.toFixed(1)}</span></div>
        <div class="hud-item"><span class="hud-label">Dead Cap (M) ${citationMarkup(deadCapCitations)}</span><span class="hud-value">${state.learner.finances.deadCapM.toFixed(1)}</span></div>
        <div class="hud-item"><span class="hud-label">Composite ${citationMarkup(modelCitations)}</span><span class="hud-value ${statusClass(gates.learnerComposite)}">${gates.learnerComposite}</span></div>
        <div class="hud-item"><span class="hud-label">AI Composite ${citationMarkup(modelCitations)}</span><span class="hud-value">${gates.aiComposite}</span></div>
        <div class="hud-item"><span class="hud-label">AI Margin ${citationMarkup(modelCitations)}</span><span class="hud-value ${gates.margin >= gates.marginRequired ? "ok" : "bad"}">${gates.margin} (need ${gates.marginRequired})</span></div>
        <div class="hud-item"><span class="hud-label">Events</span><span class="hud-value">${state.eventsTriggered}/${state.eventQuota}</span></div>
      </div>
      <div class="hud-grid">${metrics}</div>
      <div class="status-line">Legal Gate: <strong class="hud-value ${gates.legalGate ? "ok" : "bad"}">${gates.legalGate ? "PASS" : "FAIL"}</strong> | Difficulty Gate: <strong class="hud-value ${gates.difficultyGate ? "ok" : "bad"}">${gates.difficultyGate ? "PASS" : "FAIL"}</strong> | AI Margin Gate: <strong class="hud-value ${gates.aiMarginGate ? "ok" : "bad"}">${gates.aiMarginGate ? "PASS" : "FAIL"}</strong></div>
    </div>
  `;
}
