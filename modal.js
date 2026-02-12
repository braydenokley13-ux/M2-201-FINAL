import { compositeFormulaString } from "./nfl_rules.js";

const HINT_BY_LEVEL = {
  high: "rookie",
  medium: "pro",
  low: "legend",
};

const CSV_COLUMNS = [
  "timestamp",
  "difficulty",
  "learner_team",
  "ai_team",
  "mission_id",
  "role",
  "option_id",
  "legal",
  "metric_deltas",
  "cap_delta_m",
  "dead_cap_delta_m",
  "delta_cap_health",
  "delta_roster_strength",
  "delta_flexibility",
  "delta_player_relations",
  "delta_franchise_value_growth",
  "composite_after",
  "gate_flags",
  "cleared",
  "claim_code",
  "run_id",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function metricDeltaText(metricDeltas) {
  const pairs = [
    ["cap_health", "Cap Health"],
    ["roster_strength", "Roster Strength"],
    ["flexibility", "Flexibility"],
    ["player_relations", "Player Relations"],
    ["franchise_value_growth", "Franchise Value"],
  ];

  return pairs
    .map(([key, label]) => `${label}: ${metricDeltas[key] >= 0 ? "+" : ""}${metricDeltas[key]}`)
    .join(" | ");
}

function metricValueText(metrics) {
  const pairs = [
    ["cap_health", "Cap Health"],
    ["roster_strength", "Roster Strength"],
    ["flexibility", "Flexibility"],
    ["player_relations", "Player Relations"],
    ["franchise_value_growth", "Franchise Value"],
  ];
  return pairs.map(([key, label]) => `${label}: ${metrics[key]}`).join(" | ");
}

function removeCurrentModal() {
  const root = document.getElementById("modalRoot");
  if (!root) {
    return;
  }
  root.innerHTML = "";
}

function pickHint(mission, hintLevel) {
  const hintKey = HINT_BY_LEVEL[hintLevel] ?? "pro";
  return mission.hints?.[hintKey] ?? "Think through cap impact, team strength, and relationships.";
}

export function openDecisionModal(mission, options = {}) {
  const root = document.getElementById("modalRoot");
  if (!root) {
    return Promise.resolve(null);
  }

  removeCurrentModal();

  const hint = pickHint(mission, options.hintLevel ?? "medium");
  const optionMarkup = mission.options
    .map((option) => {
      return `
        <button class="option-btn" data-option-id="${escapeHtml(option.id)}">
          <div class="option-title">${escapeHtml(option.id)}. ${escapeHtml(option.label)}</div>
          <div class="option-line"><strong>Kid-simple:</strong> ${escapeHtml(option.summaryKid)}</div>
          <div class="option-line"><strong>Front-office:</strong> ${escapeHtml(option.summaryFrontOffice)}</div>
          <div class="option-line"><strong>Cap:</strong> ${option.capDeltaM >= 0 ? "+" : ""}${option.capDeltaM.toFixed(1)}M | <strong>Dead Cap:</strong> ${option.deadCapDeltaM >= 0 ? "+" : ""}${option.deadCapDeltaM.toFixed(1)}M</div>
          <div class="option-line small">${escapeHtml(metricDeltaText(option.metricDeltas))}</div>
        </button>
      `;
    })
    .join("");

  root.innerHTML = `
    <div class="modal-backdrop" data-close="1">
      <section class="modal-card" role="dialog" aria-modal="true" aria-label="Mission Decision">
        <div class="meta-chip">Role: ${escapeHtml(mission.role)}</div>
        <div class="meta-chip">Zone: ${escapeHtml(mission.zone)}</div>
        <div class="meta-chip">Urgency: ${escapeHtml(mission.urgency)}</div>
        <h2>${escapeHtml(mission.title)}</h2>
        <p>${escapeHtml(mission.description)}</p>
        <div class="formula-line"><strong>Hint (${escapeHtml(options.hintLevel ?? "medium")}):</strong> ${escapeHtml(hint)}</div>
        <div class="option-grid">${optionMarkup}</div>
      </section>
    </div>
  `;

  return new Promise((resolve) => {
    const backdrop = root.querySelector(".modal-backdrop");
    const optionButtons = root.querySelectorAll(".option-btn");

    function closeWith(value) {
      removeCurrentModal();
      resolve(value);
    }

    backdrop?.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.matches("[data-close='1']")) {
        closeWith(null);
      }
    });

    optionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeWith(button.getAttribute("data-option-id"));
      });
    });
  });
}

export function openFormulaBreakdownModal(payload) {
  const root = document.getElementById("modalRoot");
  if (!root) {
    return Promise.resolve();
  }

  removeCurrentModal();

  const afterFormula = compositeFormulaString(payload.afterMetrics);
  const legalText = payload.legality.legal ? "Legal move: PASS" : "Legal move: FAIL";
  const legalClass = payload.legality.legal ? "ok" : "bad";
  const reasonText = payload.legality.legal
    ? "No legality issues found."
    : payload.legality.reasons.join(" ");

  const eventLine = payload.event
    ? `<div class="formula-line"><strong>Random Event:</strong> ${escapeHtml(payload.event.title)} (${escapeHtml(payload.event.type)})</div>`
    : "";

  root.innerHTML = `
    <div class="modal-backdrop" data-close="1">
      <section class="modal-card" role="dialog" aria-modal="true" aria-label="Decision Outcome">
        <h2>Decision Result</h2>
        <p class="mission-line"><strong>Kid-simple:</strong> You picked <em>${escapeHtml(payload.option.label)}</em>. The game updated your team scores and cap totals right away.</p>
        <p class="mission-line"><strong>Front-office:</strong> ${escapeHtml(payload.option.summaryFrontOffice)}</p>
        <div class="formula-line ${legalClass}"><strong>${legalText}</strong> ${escapeHtml(reasonText)}</div>
        <div class="formula-line"><strong>Composite Formula:</strong> ${escapeHtml(afterFormula)} = <strong>${payload.afterComposite}</strong></div>
        <div class="formula-line"><strong>AI Composite:</strong> ${payload.aiComposite} | <strong>Current Margin:</strong> ${payload.margin} (need ${payload.marginRequired})</div>
        <div class="formula-line"><strong>Updated Metrics:</strong> ${escapeHtml(metricValueText(payload.afterMetrics))}</div>
        ${eventLine}
        <div class="row-actions" style="margin-top:10px">
          <button id="closeOutcomeButton">Continue</button>
        </div>
      </section>
    </div>
  `;

  return new Promise((resolve) => {
    const closeButton = root.querySelector("#closeOutcomeButton");
    const backdrop = root.querySelector(".modal-backdrop");

    function done() {
      removeCurrentModal();
      resolve();
    }

    closeButton?.addEventListener("click", done);
    backdrop?.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.matches("[data-close='1']")) {
        done();
      }
    });
  });
}

function encodeCsvCell(value) {
  const raw = value ?? "";
  const safe = String(raw).replaceAll('"', '""');
  return `"${safe}"`;
}

export function downloadRunCsv(runLog, fileName = "nfl-capital-run.csv") {
  const rows = [CSV_COLUMNS.join(",")];

  for (const row of runLog) {
    const line = CSV_COLUMNS.map((col) => encodeCsvCell(row[col])).join(",");
    rows.push(line);
  }

  const csvBody = rows.join("\n");
  const blob = new Blob([csvBody], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
