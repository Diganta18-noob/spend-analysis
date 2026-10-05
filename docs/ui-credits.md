# UI sources and adaptations

The application remains React/Vite. Components are locally maintained and adapted to the finance workspace.

## Incorporated public sources

- **Vengeance UI AnimatedNumber**: https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r/animated-number.json — Copyright (c) 2025-2026 Ashutoshx7, MIT. `frontend/src/components/ui/AnimatedNumber.jsx` adapts per-character AnimatePresence transitions, handles formatted INR punctuation, removes score/game styling and DOM measurement, and respects reduced motion. The full MIT notice is in `docs/vengeance-license.txt`; the retrieved registry snapshot is `docs/vengeance-number-source.json`.
- **Skiper UI Link000 (skiper40)**: https://skiper-ui.com/r/skiper40.json — Author @gurvinder-singh02. Free-version usage permits personal/commercial modification with attribution. `frontend/src/components/ui/AnimatedLink.jsx` uses a native Vite-compatible anchor and the underline transform interaction. The workspace footer visibly attributes Skiper UI. Registry snapshot and usage notice are in `docs/skiper40-source.json`. Official terms: https://skiper-ui.com/docs/quick-start.
- **Motion**: `framer-motion`, used for Vengeance-derived character changes. Reduced-motion guidance: https://motion.dev/docs/react-accessibility.

## Design references

- **Animmaster Lib**: https://animmasterlib.dev/ — reference for short page entry, grid, and hover transitions. The project uses original CSS transitions; no premium source or paid assets were copied.
- **SceneAI**: https://sceneai.art/ — reference for restrained composition and upload-page hierarchy. No paid prompts/assets or runtime package were copied or installed.

Shared shell, tables, upload, quality panels, dialogs, and portal views are original implementations using the existing design tokens, Lucide, and Recharts. All financial figures come from actual analyses, except the explicitly labeled sample mode. Credits do not imply affiliation or endorsement.
