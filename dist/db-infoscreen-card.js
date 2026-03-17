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
    this._contentEl.style.lineHeight = "1.25";

    this._card.appendChild(this._titleEl);
    this._card.appendChild(this._contentEl);
    this.appendChild(this._card);
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }

    this.config = {
      entity: "",
      title: "",
      walking_time: 5,
      group_mode: "line_direction",
      max_per_group: 4,
      max_items_time: 8,
      filter_lines: "",
      filter_directions: "",
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

    const state = this._hass.states[this.config.entity];

    this._titleEl.style.display = this.config.title ? "" : "none";
    this._titleEl.textContent = this.config.title || "";

    if (!state) {
      this._contentEl.textContent = `Entity nicht gefunden: ${this.config.entity}`;
      return;
    }

    const filterLines = this._normalizeList(this.config.filter_lines);
    const filterDirections = this._normalizeList(this.config.filter_directions);

    const deps = (state.attributes.next_departures || []).filter((d) => {
      const lineOk = !filterLines.length || filterLines.includes(String(d.train));
      const dirOk =
        !filterDirections.length || filterDirections.includes(String(d.direction));
      return lineOk && dirOk;
    });

    if (!deps.length) {
      this._contentEl.textContent = "Keine Abfahrten";
      return;
    }

    const now = Date.now() / 1000;

    const renderLine = (d) => {
      const depMins = Math.round((d.departure_timestamp - now) / 60);
      const leaveIn = depMins - Number(this.config.walking_time || 0);

      let text = `${d.departure_current} · `;
      text += leaveIn >= 0 ? `in ${leaveIn} min los` : "nicht erreichbar";

      if (typeof d.delay === "number") {
        if (d.delay > 0) text += ` · 🔴 +${d.delay}`;
        else if (d.delay < 0) text += ` · 🟡 ${d.delay}`;
        else text += ` · 🟢 0`;
      }

      if (d.is_cancelled) text += " · Ausfall";

      if (leaveIn < 0 || d.is_cancelled) {
        text = `<span style="color:#888"><s>${text}</s></span>`;
      }

      return text;
    };

    let html = "";

    if (this.config.group_mode === "time") {
      deps.slice(0, Number(this.config.max_items_time || 8)).forEach((d, i) => {
        if (i > 0) html += `<div style="height:6px"></div>`;
        html += `<div><b>${d.train} &rarr; ${d.direction}</b><br>${renderLine(d)}</div>`;
      });
    } else {
      const groups = {};
      deps.forEach((d) => {
        const key = `${d.train}|${d.direction}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(d);
      });

      Object.entries(groups).forEach(([key, arr], idx) => {
        const [train, dir] = key.split("|");
        if (idx > 0) html += `<div style="height:8px"></div>`;
        html += `<div><b>${train} &rarr; ${dir}</b></div>`;
        arr.slice(0, Number(this.config.max_per_group || 4)).forEach((d) => {
          html += `<div>${renderLine(d)}</div>`;
        });
      });
    }

    this._contentEl.innerHTML = html;
  }

  _normalizeList(value) {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value !== "string") return [];
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return {
      rows: 4,
      columns: 6,
      min_rows: 2,
      min_columns: 3,
    };
  }

  static getStubConfig() {
    return {
      entity: "",
      title: "Infoscreen",
      walking_time: 5,
      group_mode: "line_direction",
      max_per_group: 4,
      max_items_time: 8,
      filter_lines: "",
      filter_directions: "",
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: {
            entity: {
              domain: "sensor",
            },
          },
        },
        {
          name: "title",
          selector: {
            text: {},
          },
        },
        {
          type: "grid",
          name: "",
          flatten: true,
          schema: [
            {
              name: "walking_time",
              selector: {
                number: {
                  min: 0,
                  max: 30,
                  mode: "box",
                  step: 1,
                },
              },
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
              selector: {
                number: {
                  min: 1,
                  max: 20,
                  mode: "box",
                  step: 1,
                },
              },
            },
            {
              name: "max_items_time",
              selector: {
                number: {
                  min: 1,
                  max: 20,
                  mode: "box",
                  step: 1,
                },
              },
            },
          ],
        },
        {
          type: "expandable",
          name: "filters",
          title: "Filter",
          flatten: true,
          schema: [
            {
              name: "filter_lines",
              selector: {
                text: {},
              },
            },
            {
              name: "filter_directions",
              selector: {
                text: {},
              },
            },
          ],
        },
      ],
      computeLabel: (schema) => {
        const labels = {
          entity: "Entity",
          title: "Titel",
          walking_time: "Laufweg (Minuten)",
          group_mode: "Gruppierung",
          max_per_group: "Max. pro Gruppe",
          max_items_time: "Max. im Zeitmodus",
          filter_lines: "Linienfilter",
          filter_directions: "Richtungsfilter",
        };
        return labels[schema.name];
      },
      computeHelper: (schema) => {
        const helpers = {
          filter_lines: "Kommagetrennt, z. B. 179, M46",
          filter_directions:
            "Kommagetrennt, z. B. U Alt-Mariendorf, Buckow, Gerlinger Str.",
        };
        return helpers[schema.name];
      },
      assertConfig: (config) => {
        if (!config.entity) {
          throw new Error("Entity is required");
        }
      },
    };
  }
}

customElements.define("db-infoscreen-card", DBInfoscreenCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "db-infoscreen-card",
  name: "DB Infoscreen Card",
  description: "Zeigt Abfahrten aus ha-db_infoscreen an.",
  preview: false,
});
