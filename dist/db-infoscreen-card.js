class DBInfoscreenCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this.config = null;

    this._card = document.createElement("ha-card");
    this._titleEl = document.createElement("div");
    this._contentEl = document.createElement("div");

    this._titleEl.style.fontWeight = "600";
    this._titleEl.style.fontSize = "1rem";
    this._titleEl.style.padding = "8px 12px 0 12px";

    this._contentEl.style.padding = "6px 12px 12px 12px";
    this._contentEl.style.lineHeight = "1.4";
    this._contentEl.style.fontFamily = "inherit";

    this._card.appendChild(this._titleEl);
    this._card.appendChild(this._contentEl);
  }

  connectedCallback() {
    if (!this._card.parentNode) {
      this.appendChild(this._card);
    }
    if (this._hass && this.config) this.render();
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }

    this.config = {
      // Core
      entity: "",
      title: "",
      walking_time: 5,
      hide_before: null,           // hide departures with leaveIn < hide_before (null = show all)
      group_mode: "line_direction",
      max_per_group: 4,
      max_items_time: 8,
      filter_lines: "",
      filter_directions: "",

      // Display toggles
      show_delay: true,
      show_cancelled: true,
      show_unreachable: true,

      // Attribute name mapping
      attr_departures: "next_departures",
      attr_train: "train",
      attr_direction: "direction",
      attr_departure_current: "departure_current",
      attr_departure_timestamp: "departure_timestamp",
      attr_delay: "delay",
      attr_is_cancelled: "is_cancelled",

      // Text labels
      text_no_departures: "Keine Abfahrten",
      text_entity_not_found: "Entity nicht gefunden",
      text_reachable: "in {min} min los",
      text_unreachable: "nicht erreichbar",
      text_cancelled: "Ausfall",
      text_delay_prefix: "+",

      ...config,
    };

    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    if (!this._hass || !this.config) return;

    const c = this.config;
    const state = this._hass.states[c.entity];

    this._titleEl.style.display = c.title ? "" : "none";
    this._titleEl.textContent = c.title || "";

    if (!state) {
      this._contentEl.textContent = `${c.text_entity_not_found}: ${c.entity}`;
      return;
    }

    const filterLines = this._normalizeList(c.filter_lines);
    const filterDirections = this._normalizeList(c.filter_directions);

    const rawDeps = (state.attributes[c.attr_departures] || []);
    const now = Date.now() / 1000;
    const walkingTime = Number(c.walking_time || 0);
    const hideBefore = (c.hide_before !== null && c.hide_before !== undefined && c.hide_before !== "")
      ? Number(c.hide_before)
      : null;

    const deps = rawDeps.filter((d) => {
      const lineOk = !filterLines.length || filterLines.includes(String(d[c.attr_train]));
      const dirOk = !filterDirections.length || filterDirections.includes(String(d[c.attr_direction]));
      if (!lineOk || !dirOk) return false;

      if (hideBefore !== null) {
        const depMins = Math.round((d[c.attr_departure_timestamp] - now) / 60);
        const leaveIn = depMins - walkingTime;
        if (leaveIn < hideBefore) return false;
      }

      return true;
    });

    if (!deps.length) {
      this._contentEl.textContent = c.text_no_departures;
      return;
    }

    const renderRow = (d) => {
      const depMins = Math.round((d[c.attr_departure_timestamp] - now) / 60);
      const leaveIn = depMins - walkingTime;
      const isCancelled = c.show_cancelled && d[c.attr_is_cancelled];
      const isUnreachable = leaveIn < 0;

      const timeText = d[c.attr_departure_current];

      let statusText = isUnreachable
        ? c.text_unreachable
        : c.text_reachable.replace("{min}", leaveIn);

      let delayHtml = "";
      if (c.show_delay && typeof d[c.attr_delay] === "number") {
        const delay = d[c.attr_delay];
        if (delay > 0) delayHtml = `<span style="color:#e53935">🔴 ${c.text_delay_prefix}${delay}</span>`;
        else if (delay < 0) delayHtml = `<span style="color:#f9a825">🟡 ${delay}</span>`;
        else delayHtml = `<span style="color:#43a047">🟢 0</span>`;
      }

      let cancelledHtml = "";
      if (isCancelled) {
        cancelledHtml = `<span style="color:#e53935"> · ${c.text_cancelled}</span>`;
      }

      // show_unreachable: false = hide completely; true = show struck-through
      if (!c.show_unreachable && isUnreachable) return "";

      const dimmed = isUnreachable || isCancelled;
      const rowStyle = dimmed ? "color:#888;text-decoration:line-through;" : "";

      return `<div style="display:grid;grid-template-columns:3.5em 1fr fit-content(4.5em);gap:0 0.6em;align-items:baseline;padding:1px 0;${rowStyle}">
          <span style="font-variant-numeric:tabular-nums;white-space:nowrap;">${timeText}</span>
          <span>${statusText}${cancelledHtml}</span>
          <span style="white-space:nowrap;">${delayHtml}</span>
        </div>`;
    };

    let html = "";

    if (c.group_mode === "time") {
      const items = deps.slice(0, Number(c.max_items_time || 8));
      let visibleCount = 0;
      items.forEach((d) => {
        const row = renderRow(d);
        if (!row) return;
        if (visibleCount > 0) html += `<div style="height:4px"></div>`;
        html += `<div style="margin-bottom:2px;">
          <div style="font-weight:600;font-size:0.9em;">${d[c.attr_train]} &rarr; ${d[c.attr_direction]}</div>
          ${row}
        </div>`;
        visibleCount++;
      });
    } else {
      const groups = {};
      deps.forEach((d) => {
        const key = `${d[c.attr_train]}|${d[c.attr_direction]}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(d);
      });

      let groupIdx = 0;
      Object.entries(groups).forEach(([key, arr]) => {
        const [train, dir] = key.split("|");
        const rows = arr.slice(0, Number(c.max_per_group || 4))
          .map(d => renderRow(d))
          .filter(r => r);
        if (!rows.length) return; // skip group if all entries hidden
        if (groupIdx > 0) html += `<div style="height:6px"></div>`;
        html += `<div style="font-weight:600;font-size:0.9em;margin-bottom:2px;">${train} &rarr; ${dir}</div>`;
        html += rows.join("");
        groupIdx++;
      });
    }

    this._contentEl.innerHTML = html;
  }

  _normalizeList(value) {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value !== "string") return [];
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }

  getCardSize() {
    if (!this.config) return 3;
    const c = this.config;
    const isTime = c.group_mode === "time";
    // HA size unit ≈ 50px
    // time mode: each item has a header line + data line (~40px total)
    // line_direction: 1 header + max_per_group rows per group, typically 1-2 groups
    const rowPx = 22;
    const headerPx = 20;
    const paddingPx = 28;
    let estimatedPx;
    if (isTime) {
      const count = Number(c.max_items_time || 8);
      estimatedPx = count * (rowPx + headerPx) + paddingPx;
    } else {
      const perGroup = Number(c.max_per_group || 4);
      // assume ~2 groups visible on average
      estimatedPx = 2 * (headerPx + perGroup * rowPx) + paddingPx;
    }
    return Math.max(2, Math.round(estimatedPx / 50));
  }

  getGridOptions() {
    return {
      rows: 4,
      columns: 6,
      min_rows: 2,
      min_columns: 3,
    };
  }

  static getConfigElement() {
    return document.createElement("db-infoscreen-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      title: "",
      walking_time: 5,
      hide_before: null,
      group_mode: "line_direction",
      max_per_group: 4,
      max_items_time: 8,
      filter_lines: "",
      filter_directions: "",
      show_delay: true,
      show_cancelled: true,
      show_unreachable: true,
    };
  }
}

// ─── Editor ───────────────────────────────────────────────────────────────────

class DBInfoscreenCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _schema() {
    return [
      {
        name: "entity",
        required: true,
        selector: { entity: { domain: "sensor" } },
      },
      {
        name: "title",
        selector: { text: {} },
      },
      {
        type: "grid",
        name: "",
        flatten: true,
        schema: [
          {
            name: "walking_time",
            selector: { number: { min: 0, max: 60, mode: "box", step: 1 } },
          },
          {
            name: "hide_before",
            selector: { number: { min: -60, max: 60, mode: "box", step: 1 } },
          },
          {
            name: "group_mode",
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "line_direction", label: "Line + Direction" },
                  { value: "time", label: "Chronological" },
                ],
              },
            },
          },
          {
            name: "max_per_group",
            selector: { number: { min: 1, max: 20, mode: "box", step: 1 } },
          },
          {
            name: "max_items_time",
            selector: { number: { min: 1, max: 20, mode: "box", step: 1 } },
          },
        ],
      },
      {
        type: "grid",
        name: "",
        flatten: true,
        schema: [
          { name: "show_delay", selector: { boolean: {} } },
          { name: "show_cancelled", selector: { boolean: {} } },
          { name: "show_unreachable", selector: { boolean: {} } },
        ],
      },
      {
        type: "expandable",
        name: "filters",
        title: "Filter",
        flatten: true,
        schema: [
          { name: "filter_lines", selector: { text: {} } },
          { name: "filter_directions", selector: { text: {} } },
        ],
      },
      {
        type: "expandable",
        name: "attributes",
        title: "Attribut-Namen",
        flatten: true,
        schema: [
          { name: "attr_departures", selector: { text: {} } },
          { name: "attr_train", selector: { text: {} } },
          { name: "attr_direction", selector: { text: {} } },
          { name: "attr_departure_current", selector: { text: {} } },
          { name: "attr_departure_timestamp", selector: { text: {} } },
          { name: "attr_delay", selector: { text: {} } },
          { name: "attr_is_cancelled", selector: { text: {} } },
        ],
      },
      {
        type: "expandable",
        name: "labels",
        title: "Texte",
        flatten: true,
        schema: [
          { name: "text_no_departures", selector: { text: {} } },
          { name: "text_entity_not_found", selector: { text: {} } },
          { name: "text_reachable", selector: { text: {} } },
          { name: "text_unreachable", selector: { text: {} } },
          { name: "text_cancelled", selector: { text: {} } },
          { name: "text_delay_prefix", selector: { text: {} } },
        ],
      },
    ];
  }

  _computeLabel(schema) {
    const labels = {
      entity: "Entity",
      title: "Title",
      walking_time: "Walking time (minutes)",
      hide_before: "Hide before (minutes buffer)",
      group_mode: "Group mode",
      max_per_group: "Max per group",
      max_items_time: "Max in time mode",
      filter_lines: "Filter lines",
      filter_directions: "Filter directions",
      show_delay: "Show delay",
      show_cancelled: "Show cancelled",
      show_unreachable: "Show unreachable (struck-through)",
      attr_departures: "Attr: departures list",
      attr_train: "Attr: line/train",
      attr_direction: "Attr: direction",
      attr_departure_current: "Attr: departure time",
      attr_departure_timestamp: "Attr: timestamp",
      attr_delay: "Attr: delay",
      attr_is_cancelled: "Attr: is cancelled",
      text_no_departures: "Text: no departures",
      text_entity_not_found: "Text: entity not found",
      text_reachable: "Text: reachable ({min} = minutes)",
      text_unreachable: "Text: unreachable",
      text_cancelled: "Text: cancelled",
      text_delay_prefix: "Text: delay prefix",
    };
    return labels[schema.name] ?? schema.name;
  }

  _computeHelper(schema) {
    const helpers = {
      filter_lines: "Comma-separated, e.g. 179, M46",
      filter_directions: "Comma-separated, e.g. Central Station, Airport",
      hide_before: "Hide entries where buffer (depTime − walkingTime) is below this value. Empty = show all.",
      text_reachable: "{min} is replaced with the remaining minutes",
    };
    return helpers[schema.name] ?? "";
  }

  _render() {
    if (!this.shadowRoot) return;

    let form = this.shadowRoot.querySelector("ha-form");
    if (!form) {
      form = document.createElement("ha-form");
      form.addEventListener("value-changed", (e) => {
        this._config = e.detail.value;
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { config: this._config },
            bubbles: true,
            composed: true,
          })
        );
      });
      this.shadowRoot.appendChild(form);
    }

    form.hass = this._hass;
    form.data = this._config;
    form.schema = this._schema();
    form.computeLabel = (s) => this._computeLabel(s);
    form.computeHelper = (s) => this._computeHelper(s);
  }

  connectedCallback() {
    this._render();
  }
}

// ─── Registration ─────────────────────────────────────────────────────────────

if (!customElements.get("db-infoscreen-card-editor")) {
  customElements.define("db-infoscreen-card-editor", DBInfoscreenCardEditor);
}

if (!customElements.get("db-infoscreen-card")) {
  customElements.define("db-infoscreen-card", DBInfoscreenCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "db-infoscreen-card",
  name: "DB Infoscreen Card",
  description: "Displays departures from the ha-db_infoscreen integration.",
  preview: false,
});
