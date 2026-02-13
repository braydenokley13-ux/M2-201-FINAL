import { getTeamFieldCitations } from "./nfl_teams.js";
import { evaluateRunGates } from "./nfl_rules.js";

const METRIC_LABELS = {
  cap_health: "Cap Health",
  roster_strength: "Roster Strength",
  flexibility: "Flexibility",
  player_relations: "Player Relations",
  franchise_value_growth: "Franchise Value Growth",
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
  return `<span class="citation-stack">${citations
    .map((citation) => {
      return `<a class=\"citation-pill\" href=\"${escapeHtml(citation.url)}\" target=\"_blank\" rel=\"noreferrer noopener\" title=\"${escapeHtml(citation.label)}\">src</a>`;
    })
    .join(" ")}</span>`;
}

function metricCard(label, value, citations) {
  return `
    <article class="hud-metric">
      <div class="hud-label">${label} ${citationMarkup(citations)}</div>
      <div class="hud-value ${statusClass(value)}">${value}</div>
    </article>
  `;
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
  const progressPct = missionTotal === 0 ? 0 : Math.round((missionDone / missionTotal) * 100);

  const capCitations = getTeamFieldCitations(state.learner.teamId, "capSpaceM");
  const deadCapCitations = getTeamFieldCitations(state.learner.teamId, "deadCapM");
  const modelCitations = getTeamFieldCitations(state.learner.teamId, "compositeModel");

  const metricCards = Object.entries(METRIC_LABELS)
    .map(([key, label]) => metricCard(label, state.learner.metrics[key], modelCitations))
    .join("");
  const missionPosition = missionTotal === 0 ? 0 : Math.min(missionDone + 1, missionTotal);

  root.innerHTML = `
    <section class="hud-card premium-hud">
      <header class="hud-head">
        <div class="hud-title-row">
          <h3 class="hud-title">${state.learner.teamName} vs ${state.ai.teamName}</h3>
          <span class="hud-role-chip">${currentMission ? currentMission.role : "RUN COMPLETE"}</span>
        </div>
        <div class="hud-sub">Difficulty ${state.difficulty} | Run ${state.runId}</div>
      </header>

      <div class="hud-block hud-progress-block">
        <div class="hud-section-title">Mission Progress</div>
        <div class="hud-progress-track" aria-label="Mission progress">
          <div class="hud-progress-fill" style="width:${progressPct}%"></div>
        </div>
        <div class="hud-progress-label">Mission ${missionPosition} of ${missionTotal}</div>
      </div>

      <div class="hud-block">
        <div class="hud-section-title">Game Pulse</div>
        <div class="hud-kpi-grid">
          <article class="hud-kpi">
            <div class="hud-kpi-label">Cap Space ${citationMarkup(capCitations)}</div>
            <div class="hud-kpi-value">${state.learner.finances.capSpaceM.toFixed(1)}M</div>
          </article>
          <article class="hud-kpi">
            <div class="hud-kpi-label">Dead Cap ${citationMarkup(deadCapCitations)}</div>
            <div class="hud-kpi-value">${state.learner.finances.deadCapM.toFixed(1)}M</div>
          </article>
          <article class="hud-kpi">
            <div class="hud-kpi-label">Composite ${citationMarkup(modelCitations)}</div>
            <div class="hud-kpi-value ${statusClass(gates.learnerComposite)}">${gates.learnerComposite}</div>
          </article>
          <article class="hud-kpi">
            <div class="hud-kpi-label">AI Composite ${citationMarkup(modelCitations)}</div>
            <div class="hud-kpi-value">${gates.aiComposite}</div>
          </article>
          <article class="hud-kpi">
            <div class="hud-kpi-label">AI Margin ${citationMarkup(modelCitations)}</div>
            <div class="hud-kpi-value ${gates.margin >= gates.marginRequired ? "ok" : "bad"}">${gates.margin} (need ${gates.marginRequired})</div>
          </article>
          <article class="hud-kpi">
            <div class="hud-kpi-label">Events</div>
            <div class="hud-kpi-value">${state.eventsTriggered}/${state.eventQuota}</div>
          </article>
        </div>
      </div>

      <div class="hud-block">
        <div class="hud-section-title">Core Metrics</div>
        <div class="hud-metrics-grid">${metricCards}</div>
      </div>

      <div class="status-line">
        <span>Legal <strong class="hud-value ${gates.legalGate ? "ok" : "bad"}">${gates.legalGate ? "PASS" : "FAIL"}</strong></span>
        <span>Difficulty <strong class="hud-value ${gates.difficultyGate ? "ok" : "bad"}">${gates.difficultyGate ? "PASS" : "FAIL"}</strong></span>
        <span>AI Margin <strong class="hud-value ${gates.aiMarginGate ? "ok" : "bad"}">${gates.aiMarginGate ? "PASS" : "FAIL"}</strong></span>
      </div>
    </section>
  `;
}
