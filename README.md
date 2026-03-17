# DB Infoscreen Card

Custom Lovelace card for displaying DB Infoscreen departures in Home Assistant.

## Features

- Group by line + direction or by time
- Filter by lines and directions
- Walking time support
- "in X min los" calculation
- Delay indicators (🟢 🟡 🔴)
- Cancelled and unreachable trips crossed out

## Installation

### Manual

1. Copy `dist/db-infoscreen-card.js` to:
   `/config/www/db-infoscreen-card.js`

2. Add resource:

Settings → Dashboards → Resources
   `/local/db-infoscreen-card.js`

Type: `module`

3. Use card:

```yaml
type: custom:db-infoscreen-card
entity: sensor.db_infoscreen_tropfsteinweg_departures
title: Tropfsteinweg
