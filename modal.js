import { getCitationsByIds } from "./nfl_sources.js";
import { compositeFormulaString } from "./nfl_rules.js";

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
  "review_checksum",
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

function citationMarkup(citations = []) {
  if (!citations || citations.length === 0) {
    return "";
  }
  return `<span class=\"citation-stack\">${citations
    .map((citation) => {
      return `<a class=\"citation-pill\" href=\"${escapeHtml(citation.url)}\" target=\"_blank\" rel=\"noreferrer noopener\" title=\"${escapeHtml(citation.label)}\">src</a>`;
    })
    .join(" ")}</span>`;
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

function deltaClass(value) {
  if (value > 0) {
    return "good";
  }
  if (value < 0) {
    return "bad";
  }
  return "flat";
}

function optionTagMarkup(option) {
  const tags = option.tuningTags ?? [];
  if (tags.length === 0) {
    return "";
  }
  return `<div class="option-tags">${tags
    .map((tag) => `<span class="option-tag">${escapeHtml(tag)}</span>`)
    .join("")}</div>`;
}

function removeCurrentModal() {
  const root = document.getElementById("modalRoot");
  if (!root) {
    return;
  }
  root.innerHTML = "";
}

function getHintBlock(mission, options) {
  if (options.hintBlock) {
    return options.hintBlock;
  }
  const fallbackKey =
    options.hintLevel === "high" ? "rookie" : options.hintLevel === "low" ? "legend" : "pro";
  return {
    kid: mission.hints?.[fallbackKey] ?? "Think through cap impact, team strength, and trust.",
    frontOffice: "Model short-term cap and long-term flexibility before locking a move.",
    trigger: "difficulty-default",
  };
}

export function openDecisionModal(mission, options = {}) {
  const root = document.getElementById("modalRoot");
  if (!root) {
    return Promise.resolve(null);
  }

  removeCurrentModal();

  const hint = getHintBlock(mission, options);
  const missionCitations = getCitationsByIds(mission.citationIds ?? []);
  const roleCitations = options.roleCitations ?? [];

  const optionMarkup = mission.options
    .map((option) => {
      const optionCitations = getCitationsByIds(option.citationIds ?? []);
      return `
        <button class="option-btn mission-option" data-option-id="${escapeHtml(option.id)}">
          <div class="option-head">
            <div class="option-title">${escapeHtml(option.id)}. ${escapeHtml(option.label)}</div>
            <div class="option-pills">
              <span class="delta-pill ${deltaClass(option.capDeltaM)}">Cap ${option.capDeltaM >= 0 ? "+" : ""}${option.capDeltaM.toFixed(1)}M</span>
              <span class="delta-pill ${deltaClass(-option.deadCapDeltaM)}">Dead ${option.deadCapDeltaM >= 0 ? "+" : ""}${option.deadCapDeltaM.toFixed(1)}M</span>
            </div>
          </div>
          ${optionTagMarkup(option)}
          <div class="option-line"><strong>Kid-simple:</strong> ${escapeHtml(option.summaryKid)}</div>
          <div class="option-line"><strong>Front-office:</strong> ${escapeHtml(option.summaryFrontOffice)}</div>
          <div class="option-line small">${escapeHtml(metricDeltaText(option.metricDeltas))} ${citationMarkup(roleCitations)}</div>
          <div class="option-line small">Sources: ${citationMarkup(optionCitations)}</div>
        </button>
      `;
    })
    .join("");

  root.innerHTML = `
    <div class="modal-backdrop" data-close="1">
      <section class="modal-card mission-modal" role="dialog" aria-modal="true" aria-label="Mission Decision">
        <div class="modal-topline">
          <div class="modal-badges">
            <span class="meta-chip">Role: ${escapeHtml(mission.role)}</span>
            <span class="meta-chip">Zone: ${escapeHtml(mission.zone)}</span>
            <span class="meta-chip">Urgency: ${escapeHtml(mission.urgency)}</span>
          </div>
          <button class="modal-close-btn" id="closeMissionModal" aria-label="Close mission card">Close</button>
        </div>
        <h2>${escapeHtml(mission.title)}</h2>
        <p class="mission-line">${escapeHtml(mission.description)} ${citationMarkup(missionCitations)}</p>
        <div class="hint-grid">
          <div class="formula-line"><strong>Hint trigger:</strong> ${escapeHtml(hint.trigger)}</div>
          <div class="formula-line"><strong>Kid-simple hint:</strong> ${escapeHtml(hint.kid)}</div>
          <div class="formula-line"><strong>Front-office hint:</strong> ${escapeHtml(hint.frontOffice)}</div>
        </div>
        <div class="option-grid">${optionMarkup}</div>
      </section>
    </div>
  `;

  return new Promise((resolve) => {
    const backdrop = root.querySelector(".modal-backdrop");
    const optionButtons = root.querySelectorAll(".option-btn");
    const closeButton = root.querySelector("#closeMissionModal");

    function closeWith(value) {
      removeCurrentModal();
      resolve(value);
    }

    backdrop?.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.matches("[data-close='1']")) {
        closeWith(null);
      }
    });

    closeButton?.addEventListener("click", () => {
      closeWith(null);
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
    ? `<div class="formula-line"><strong>Random Event:</strong> ${escapeHtml(payload.event.title)} (${escapeHtml(payload.event.type)}) ${citationMarkup(getCitationsByIds(payload.event.citationIds ?? []))}</div>`
    : "";

  const formulaCitations = payload.formulaCitations ?? [];
  const capCitations = payload.capCitations ?? [];

  root.innerHTML = `
    <div class="modal-backdrop" data-close="1">
      <section class="modal-card result-modal" role="dialog" aria-modal="true" aria-label="Decision Outcome">
        <div class="modal-topline">
          <h2>Decision Result</h2>
          <button class="modal-close-btn" id="closeOutcomeButton" aria-label="Continue">Continue</button>
        </div>
        <p class="mission-line"><strong>Kid-simple:</strong> You picked <em>${escapeHtml(payload.option.label)}</em>. The game updated your team scores and cap totals right away.</p>
        <p class="mission-line"><strong>Front-office:</strong> ${escapeHtml(payload.option.summaryFrontOffice)}</p>
        <div class="formula-line ${legalClass}"><strong>${legalText}</strong> ${escapeHtml(reasonText)} ${citationMarkup(capCitations)}</div>
        <div class="formula-line"><strong>Composite Formula:</strong> ${escapeHtml(afterFormula)} = <strong>${payload.afterComposite}</strong> ${citationMarkup(formulaCitations)}</div>
        <div class="formula-line"><strong>AI Composite:</strong> ${payload.aiComposite} | <strong>Current Margin:</strong> ${payload.margin} (need ${payload.marginRequired}) ${citationMarkup(formulaCitations)}</div>
        <div class="formula-line"><strong>Updated Metrics:</strong> ${escapeHtml(metricValueText(payload.afterMetrics))} ${citationMarkup(formulaCitations)}</div>
        ${eventLine}
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

export function buildRunCsvString(runLog) {
  const rows = [CSV_COLUMNS.join(",")];
  for (const row of runLog) {
    const line = CSV_COLUMNS.map((col) => encodeCsvCell(row[col])).join(",");
    rows.push(line);
  }
  return rows.join("\n");
}

export function downloadRunCsv(runLog, fileName = "nfl-capital-run.csv") {
  const csvBody = buildRunCsvString(runLog);
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

export function getCsvColumns() {
  return [...CSV_COLUMNS];
}
