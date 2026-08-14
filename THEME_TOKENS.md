# Finwise Theme Tokens

The current interface uses a **deep midnight navy**, **warm ivory**, and **muted champagne-gold** system that complements the owner-supplied PNG logo files. The dark canvas is `#010817`, exactly matching the edge color of the supplied dark logo file; this preserves the opaque source artwork unchanged while allowing it to integrate with the authentication surface.

| Semantic role | Shared token or utility mapping | Usage |
|---|---|---|
| Canvas / dark surface | `--canvas`, `--sidebar`, `--panel`, `--raised` | Page background, navigation, cards, inputs, dialogs. |
| Primary text | `--ink`, `--muted` | Warm ivory primary copy and restrained secondary copy. |
| Brand accent | `--accent`, `--accent-soft`, `lime-200/300/400` mapping | Muted champagne-gold buttons, active navigation, progress, and decorative emphasis. The historical `lime` utility name maps only to champagne values and does not render green. |
| Positive financial state | `--positive`, `--positive-soft` | Positive change, earnings, and successful status cues. |
| Destructive / error state | `--danger`, `--danger-soft` | Delete-account actions, negative balances, destructive messaging, and error feedback. |
| Informational reserve state | `blue-300` mapping | Muted desaturated blue for cash-reserve information, distinct from both brand-gold and positive-green. |

## Intentional Direct Values

The remaining source literals are intentionally semantic, not residual theme colors. Chart components retain a compact categorical palette because their library APIs consume color strings directly: muted champagne (`#C6A15A` / `#D8C38E`) for primary series, subdued green (`#73B68B`) for positive series, muted red (`#C96F63`) for negative series, and neutral slate values for remaining categories. Direct red literals in destructive cards and transaction states remain only as their danger-state equivalents. No periwinkle source values or recreated logo URLs remain in runtime code.

## Motion Coverage

Finwise motion is deliberately limited to opacity and transforms. Shared cards use `finwise-reveal` and `finwise-lift`; the shared `Modal` uses `finwise-reveal`; navigation uses a two-pixel hover translation. Transaction, calendar, account, and analysis collections opt into `finwise-stagger`, which applies a short, bounded reveal delay to existing children. All nonessential motion is disabled by the reduced-motion CSS override in `app/globals.css`.
