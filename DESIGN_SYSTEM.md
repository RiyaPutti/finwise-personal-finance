# Finwise Design System

Finwise uses a **quiet ledger** visual language: data is given generous room, key values use tabular numerals, and colour expresses financial state rather than decoration. The default theme is dark; a light theme follows the same hierarchy and contrast model.

| Foundation | Dark token | Light token | Intended use |
|---|---:|---:|---|
| Canvas | `#101210` | `#F7F7F4` | Application background |
| Panel | `#181B18` | `#FFFFFF` | Cards, sheets, dialogs |
| Raised panel | `#202420` | `#F0F1ED` | Active navigation and controls |
| Primary text | `#F2F4ED` | `#1C211D` | Important values and headings |
| Secondary text | `#A4AAA2` | `#657068` | Labels and supporting information |
| Accent | `#BDE66D` | `#547C18` | Primary action and positive emphasis |
| Expense | `#F1967E` | `#B74231` | Spending and destructive actions |
| Information | `#8BB5E8` | `#245B97` | Neutral informative states |

## Component Rules

The application relies on reusable primitives for buttons, fields, dialogs, segmented controls, list rows, metric cards, empty states, charts, and status badges. Controls have 10–14 px corner radii, compact 40 px minimum height, visible keyboard focus, and a pressed scale response. Tables are intentionally rendered as stacked ledger rows on narrow screens rather than compressed desktop grids.

Charts use sage for income and progress, terracotta for spending, and muted slate for reference series. Charts never manufacture values: when a query has no data, the component presents an explanatory empty state.

## Screen Map

| Screen | Primary job | Shared components |
|---|---|---|
| Authentication | Secure entry and OAuth handoff | Auth card, brand mark, provider button |
| Overview | Current position and recent movement | Sidebar, metric cards, trend chart, activity rows |
| Accounts | Configure money locations | Account cards, balance ring, account dialog |
| Transactions | Search and maintain ledger | Filter bar, grouped transaction rows, entry dialog |
| Cash Wallet / Cash Reserve | Isolate physical cash and reserved cash | Account detail header, transfer action, history rows |
| Spend / Monthly / Yearly Analysis | Understand real behaviour over time | Time filter, stat strip, chart cards, insights |
| Budgets / Goals | Set optional boundaries and objectives | Progress cards, contextual empty states, dialogs |
| Settings | Preferences and data portability | Form sections, theme control, import/export controls |

The current Figma connector is not exposed to this task session. This document and the matching component tokens form the implementation source of truth until the connector becomes available.
