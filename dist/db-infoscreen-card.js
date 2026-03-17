class DBInfoscreenCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("entity required");

    this.config = {
      walking_time: 5,
      group_mode: "line_direction",
      max_per_group: 4,
      max_items_time: 8,
      filter_lines: [],
      filter_directions: [],
      title: "",
      ...config,
    };
  }

  set hass(hass) {
    this._hass = hass;
  }

  render() {
    if (!this._hass || !this.config) return;

    const state = this._hass.states[this.config.entity];
    this.innerHTML = "";

    const card = document.createElement("ha-card");

    if (!state) {
      const content = document.createElement("div");
      content.style.padding = "12px";
      content.textContent = `Entity nicht gefunden: ${this.config.entity}`;
      card.appendChild(content);
      this.appendChild(card);
      return;
    }

    const deps = (state.attributes.next_departures || []).filter((d) => {
      const lineOk =
        !this.config.filter_lines.length ||
        this.config.filter_lines.includes(d.train);

      const dirOk =
        !this.config.filter_directions.length ||
        this.config.filter_directions.includes(d.direction);

      return lineOk && dirOk;
    });

    if (this.config.title) {
      const header = document.createElement("div");
      header.className = "card-header";
      header.innerText = this.config.title;
      card.appendChild(header);
    }

    const content = document.createElement("div");
    content.style.padding = "6px";
    content.style.lineHeight = "1.25";

    if (!deps.length) {
      content.innerText = "Keine Abfahrten";
      card.appendChild(content);
      this.appendChild(card);
      return;
    }

    const now = Date.now() / 1000;

    const renderLine = (d) => {
      const depMins = Math.round((d.departure_timestamp - now) / 60);
      const leaveIn = depMins - this.config.walking_time;

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

    if (this.config.group_mode === "time") {
      deps.slice(0, this.config.max_items_time).forEach((d) => {
        const row = document.createElement("div");
        row.innerHTML = `<b>${d.train} → ${d.direction}</b><br>${renderLine(d)}`;
        row.style.marginBottom = "6px";
        content.appendChild(row);
      });
    } else {
      const groups = {};

      deps.forEach((d) => {
        const key = `${d.train}|${d.direction}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(d);
      });

      Object.entries(groups).forEach(([key, arr], index, all) => {
        const [train, dir] = key.split("|");

        const header = document.createElement("div");
        header.innerHTML = `<b>${train} → ${dir}</b>`;
        if (index > 0) header.style.marginTop = "8px";
        content.appendChild(header);

        arr.slice(0, this.config.max_per_group).forEach((d) => {
          const row = document.createElement("div");
          row.innerHTML = renderLine(d);
          content.appendChild(row);
        });

        if (index < all.length - 1) {
          const spacer = document.createElement("div");
          spacer.style.height = "6px";
          content.appendChild(spacer);
        }
      });
    }

    card.appendChild(content);
    this.appendChild(card);
  }

  getCardSize() {
    return 4;
  }

  static getConfigElement() {
    return document.createElement("db-infoscreen-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      title: "Infoscreen",
      walking_time: 5,
      group_mode: "line_direction",
      max_per_group: 4,
      max_items_time: 8,
      filter_lines: [],
      filter_directions: []
    };
  }
}

class DBInfoscreenCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      entity: "",
      title: "",
      walking_time: 5,
      group_mode: "line_direction",
      max_per_group: 4,
      max_items_time: 8,
      filter_lines: [],
      filter_directions: [],
      ...config
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  _schema() {
    return [
      { name: "entity", selector: { entity: {} } },
      { name: "title", selector: { text: {} } },
      { name: "walking_time", selector: { number: { min: 0, max: 30, mode: "box" } } },
      {
        name: "group_mode",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "line_direction", label: "Line + Direction" },
              { value: "time", label: "Chronological" }
            ]
          }
        }
      },
      { name: "max_per_group", selector: { number: { min: 1, max: 20, mode: "box" } } },
      { name: "max_items_time", selector: { number: { min: 1, max: 20, mode: "box" } } },
      { name: "filter_lines", selector: { text: {} } },
      { name: "filter_directions", selector: { text: {} } }
    ];
  }

  _handleChange(ev) {
    const value = ev.detail.value;

    const newConfig = {
      ...this._config,
      ...value
    };

    newConfig.filter_lines = this._normalizeList(newConfig.filter_lines);
    newConfig.filter_directions = this._normalizeList(newConfig.filter_directions);

    this._config = newConfig;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: newConfig },
        bubbles: true,
        composed: true
      })
    );
  }

  _normalizeList(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value.split(",").map(v => v.trim()).filter(Boolean);
    }
    return [];
  }

  render() {
    if (!this._hass || !this._config) return;

    this.innerHTML = "";

    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = {
      ...this._config,
      filter_lines: this._config.filter_lines.join(", "),
      filter_directions: this._config.filter_directions.join(", ")
    };
    form.schema = this._schema();
    form.addEventListener("value-changed", (ev) => this._handleChange(ev));
    this.appendChild(form);

    const help = document.createElement("div");
    help.style.paddingTop = "8px";
    help.style.fontSize = "0.85em";
    help.style.color = "var(--secondary-text-color)";
    help.textContent = "Linienfilter und Richtungsfilter als kommagetrennte Liste eingeben.";
    this.appendChild(help);
  }
}

customElements.define("db-infoscreen-card", DBInfoscreenCard);
customElements.define("db-infoscreen-card-editor", DBInfoscreenCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "db-infoscreen-card",
  name: "DB Infoscreen Card",
  description: "Zeigt Abfahrten aus ha-db_infoscreen an."
});
