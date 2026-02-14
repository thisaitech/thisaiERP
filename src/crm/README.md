# Admissions CRM Module

Student admissions CRM (lead pipeline) for ThisAI ERP.

## Features

- Dashboard (pipeline overview, follow-ups, performance insights)
- Leads list (search, filters, quick actions)
- Admissions pipeline board (drag and drop between stages)
- Settings (lead sources, lost reasons, programs, follow-up checklist, stage label overrides)

## Data / API

This module uses the ERP REST API (not Firebase):

- Leads: `GET/POST/PUT/DELETE /api/leads`
- Settings: `GET/PUT /api/settings/admissions_crm_settings`

## Routing

The main ERP route `/crm` renders `src/crm/pages/CRMPage.tsx` via `src/pages/CRM.tsx`.

## Dev

1. Start API: `cd server; npm run dev`
2. Start web: `npm run dev`

