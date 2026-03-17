# DB Infoscreen Card

Custom Lovelace card for Home Assistant to display departures from the  
`ha-db_infoscreen` integration in a clean and compact layout.

Designed for dashboards, tablets and wall panels.

---

## ✨ Features

- Group by **line + direction** or by **time**
- Optional filters for **lines** and **directions**
- Walking time support (`in X min los`)
- Delay indicators (🟢 🟡 🔴)
- Automatically marks:

  - unreachable departures
  - cancelled trips

- Compact layout without Markdown spacing issues

---

## 📦 Installation

### Manual

1. Copy:

```
dist/db-infoscreen-card.js
```

to:

```
/config/www/db-infoscreen-card.js
```

2. Add resource:

Settings → Dashboards → Resources

```
URL: /local/db-infoscreen-card.js
Type: module
```

3. Add card:

```yaml
type: custom:db-infoscreen-card
entity: sensor.db_infoscreen_xyz_departures
title: XYZ
```

---

## ⚙️ Options

| Option            | Default          | Description |
|------------------|------------------|-------------|
| entity           | required         | Sensor entity |
| title            | ""               | Card title |
| walking_time     | 5                | Walking time in minutes |
| group_mode       | line_direction   | `line_direction` or `time` |
| max_per_group    | 4                | Items per group |
| max_items_time   | 8                | Items in time mode |
| filter_lines     | []               | Only show selected lines |
| filter_directions| []               | Only show selected directions |

---

## 🧪 Examples

### Default

```yaml
type: custom:db-infoscreen-card
entity: sensor.db_infoscreen_xyz_departures
title: Tropfsteinweg
```

---

### Chronological View

```yaml
group_mode: time
```

---

### Filter by Line

```yaml
filter_lines:
  - "123"
```

---

### Filter by Direction

```yaml
filter_directions:
  - "ABC"
```

---

## 📌 Notes

- Requires the `ha-db_infoscreen` integration.
- The card does **not fetch data itself** — it only renders the sensor.

---

## ❤️ Credits

Built for personal Home Assistant dashboards.
