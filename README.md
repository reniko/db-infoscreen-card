# DB Infoscreen Card

Custom Lovelace card for Home Assistant to display departures from the
`ha-db_infoscreen` integration in a clean, compact, tabular layout.

Designed for dashboards, tablets and wall panels.

---

## ✨ Features

- Group by **line + direction** or by **time**
- Configurable **walking time** — marks unreachable departures
- Configurable **hide_before** threshold — hides entries below a minimum buffer
- Optional filters for **lines** and **directions**
- Toggle display of **delay**, **cancellations**, and **unreachable** entries
- Delay indicators (🟢 🟡 🔴)
- Automatically marks unreachable and cancelled trips
- All **attribute names** configurable (compatible with other integrations)
- All **UI texts** configurable (multilingual support)
- Compact tabular layout with aligned columns

---

## 📦 Installation

### Via HACS

1. Add this repository as a custom repository in HACS
2. Install **DB Infoscreen Card**
3. Reload the browser

### Manual

1. Copy `dist/db-infoscreen-card.js` to `/config/www/db-infoscreen-card.js`
2. Add resource in **Settings → Dashboards → Resources**:
   ```
   URL: /local/db-infoscreen-card.js
   Type: JavaScript Module
   ```
3. Add the card to your dashboard

---

## ⚙️ Options

### Core

| Option | Default | Description |
|---|---|---|
| `entity` | required | Sensor entity providing departure data |
| `title` | `""` | Optional card title |
| `walking_time` | `5` | Walking time in minutes. Departures where `depTime - walkingTime < 0` are marked unreachable |
| `hide_before` | `null` | Hide departures where the remaining buffer (depTime − walkingTime) is less than this value. E.g. `-5` hides everything already more than 5 min past reachable. `null` = show all |
| `group_mode` | `line_direction` | `line_direction` groups by line+direction, `time` shows chronologically |
| `max_per_group` | `4` | Max entries per group (line_direction mode) |
| `max_items_time` | `8` | Max entries total (time mode) |
| `filter_lines` | `[]` | Only show these lines (comma-separated string or YAML list) |
| `filter_directions` | `[]` | Only show these directions (comma-separated string or YAML list) |

### Display Toggles

| Option | Default | Description |
|---|---|---|
| `show_delay` | `true` | Show delay indicator |
| `show_cancelled` | `true` | Show cancelled trips (struck through) |
| `show_unreachable` | `true` | Show unreachable trips (struck through) |
| `show_delay_icons` | `true` | Show colored emoji icons next to delay values (🟢 🟡 🔴) |

### Attribute Names

Override these if your integration uses different attribute names:

| Option | Default |
|---|---|
| `attr_departures` | `next_departures` |
| `attr_train` | `train` |
| `attr_direction` | `direction` |
| `attr_departure_current` | `departure_current` |
| `attr_departure_timestamp` | `departure_timestamp` |
| `attr_delay` | `delay` |
| `attr_is_cancelled` | `is_cancelled` |

### Texts / Labels

| Option | Default |
|---|---|
| `text_no_departures` | `Keine Abfahrten` |
| `text_entity_not_found` | `Entity nicht gefunden` |
| `text_reachable` | `in {min} min los` |
| `text_unreachable` | `nicht erreichbar` |
| `text_cancelled` | `Ausfall` |
| `text_delay_prefix` | `+` |

> `{min}` in `text_reachable` is replaced with the actual remaining minutes.

---

## 🧪 Examples

### Minimal

```yaml
type: custom:db-infoscreen-card
entity: sensor.my_station_departures
```

### With walking time and hide threshold

```yaml
type: custom:db-infoscreen-card
entity: sensor.my_station_departures
walking_time: 10
hide_before: -5
```

This shows all departures where you still have at least −5 minutes buffer
(i.e. up to 5 minutes late is still shown), but hides everything older.

### Chronological view

```yaml
type: custom:db-infoscreen-card
entity: sensor.my_station_departures
group_mode: time
max_items_time: 10
```

### Filter by line and direction

```yaml
type: custom:db-infoscreen-card
entity: sensor.my_station_departures
filter_lines:
  - "179"
  - "M46"
filter_directions:
  - Hauptbahnhof
```

### Hide delay and unreachable entries

```yaml
type: custom:db-infoscreen-card
entity: sensor.my_station_departures
show_delay: false
show_unreachable: false
```

### English labels

```yaml
type: custom:db-infoscreen-card
entity: sensor.my_station_departures
text_no_departures: No departures
text_reachable: "leave in {min} min"
text_unreachable: too late
text_cancelled: cancelled
```

---

## 📌 Notes

- Requires the `ha-db_infoscreen` integration (or any integration providing compatible sensor attributes).
- The card does **not fetch data itself** — it only renders the sensor state.
- The `hide_before` filter runs **after** `walking_time` is subtracted. So `hide_before: 0` hides all currently unreachable departures, `hide_before: -5` still shows entries up to 5 min past unreachable.

---

## ❤️ Credits

Built for personal Home Assistant dashboards.
