# Codex Rules

You are building Escape the Elites: The Broadcast, a browser-based investigative survival-horror game using React, TypeScript, Vite, and PlayCanvas.

## Primary Goal
Build a stable, polished, evidence-driven web game. Do not build unrelated systems.

## Architecture Rules
- React owns UI.
- PlayCanvas owns 3D gameplay.
- Data is JSON-driven.
- TypeScript types must be explicit.
- Systems must be modular.
- No large rewrites unless requested.
- Do not touch unrelated files.
- Every task must include manual test steps.
- Every feature must have acceptance criteria.

## Content Rules
- The game is fictional.
- No explicit sexual abuse scenes.
- No real victim names.
- No real accused names in fictional scenes.
- Evidence should imply crimes through documents, logs, surveillance, and environmental storytelling.
- Tone is cold, realistic, and restrained.

## Quality Rules
- `npm run build` must pass.
- No console errors on load.
- Player must not softlock.
- Save data must be versioned.
- UI must remain readable.
- Accessibility settings are required.
