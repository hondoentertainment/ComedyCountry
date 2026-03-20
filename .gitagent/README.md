# comedy-country

Punchline Atlas — AI agent for building and maintaining ComedyCountry, a nationwide comedy intelligence platform for discovering venues, tracking comedian tours, and never missing a show.

## Run

```bash
npx @open-gitagent/gitagent run -r https://github.com/hondoentertainment/ComedyCountry
```

## What It Can Do

- **feature-dev** — Build end-to-end features from schema to UI
- **api-dev** — Create and maintain REST API endpoints (257+ routes)
- **db-schema** — Design and evolve the Prisma database schema (40+ models)
- **testing** — Write and run unit, integration, and E2E tests
- **venue-ops** — Build venue operations: POS, capacity, staffing, menus

## Structure

```
.gitagent/
├── agent.yaml
├── SOUL.md
├── RULES.md
├── README.md
├── skills/
│   ├── feature-dev/
│   │   └── SKILL.md
│   ├── api-dev/
│   │   └── SKILL.md
│   ├── db-schema/
│   │   └── SKILL.md
│   ├── testing/
│   │   └── SKILL.md
│   └── venue-ops/
│       └── SKILL.md
└── knowledge/
    ├── index.yaml
    ├── architecture.md
    └── api-map.md
```

## Built with

[gitagent](https://github.com/open-gitagent/gitagent) — a git-native, framework-agnostic open standard for AI agents.
