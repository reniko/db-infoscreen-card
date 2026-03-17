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
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    if (!this._hass || !this.config) return;

    const state = this._hass.states[this.config.entity];
    if (!state) return;

    const deps = (state.attributes.next_departures || []).filter(d => {
      const lineOk =
        !this.config.filter_lines.length ||
        this.config.filter_lines.includes(d.train);
      const dirOk =
        !this.config.filter_directions.length ||
        this.config.filter_directions.includes(d.direction);
      return lineOk && dirOk;
    });

    const card = document.createElement("ha-card");
    if (this.config.title) {
      const h = document.createElement("div");
      h.className = "card-header";
      h.innerText = this.config.title;
      card.appendChild(h);
    }

    const content = document.createElement("div");
    content.style.padding = "12px";

    if (!deps.length) {
      content.innerText = "Keine Abfahrten";
      card.appendChild(content);
      this.innerHTML = "";
      this.appendChild(card);
      return;
    }

    const now = Date.now() / 1000;

    const renderLine = d => {
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
      deps.slice(0, this.config.max_items_time).forEach(d => {
        const row = document.createElement("div");
        row.innerHTML = `<b>${d.train} → ${d.direction}</b>: ${renderLine(d)}`;
        content.appendChild(row);
      });
    } else {
      const groups = {};
      deps.forEach(d => {
        const key = `${d.train}|${d.direction}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(d);
      });

      Object.entries(groups).forEach(([key, arr]) => {
        const [train, dir] = key.split("|");

        const header = document.createElement("div");
        header.innerHTML = `<b>${train} → ${dir}</b>`;
        header.style.marginTop = "6px";
        content.appendChild(header);

        arr.slice(0, this.config.max_per_group).forEach(d => {
          const row = document.createElement("div");
          row.innerHTML = renderLine(d);
          content.appendChild(row);
        });
      });
    }

    card.appendChild(content);
    this.innerHTML = "";
    this.appendChild(card);
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("db-infoscreen-card", DBInfoscreenCard);
