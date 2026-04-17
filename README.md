# api00

Node.js + Express starter API in plain JavaScript. No database, no auth — just a clean
foundation to grow a real API on top of.

## Stack

- Node.js 20+ (ESM)
- [Express](https://expressjs.com/) 4
- [Vitest](https://vitest.dev/) + [supertest](https://github.com/ladjs/supertest) for tests
- ESLint (flat config) + Prettier + EditorConfig
- Husky + lint-staged + commitlint (Conventional Commits)
- GitHub Actions CI (lint + format check + tests)

## Requirements

- Node.js 20 or later (see `.nvmrc`)
- npm 10+

## Getting started

```bash
# install dependencies (also installs git hooks via the prepare script)
npm install

# copy the example env file
cp .env.example .env

# run the dev server with auto-reload
npm run dev
```

The API listens on `http://localhost:3000` by default.

## Endpoints

| Method | Path                          | Description                                                       |
| ------ | ----------------------------- | ----------------------------------------------------------------- |
| GET    | `/`                           | Static HTML UI with buttons to load/download cocktails            |
| GET    | `/api`                        | API metadata (name, version, endpoints)                           |
| GET    | `/api/cocktails?letter={a-z}` | List of cocktails (name + ingredients) proxied from thecocktaildb |
| GET    | `/health`                     | Liveness probe with uptime                                        |

Unknown routes return `404` with a JSON body `{ "error": "Not Found", "path": "..." }`.

### `/api/cocktails`

Proxies the free [thecocktaildb](https://www.thecocktaildb.com/) API
(`search.php?f={letter}`) and returns a trimmed list:

```json
[
  {
    "id": "11007",
    "name": "Margarita",
    "category": "Ordinary Drink",
    "glass": "Cocktail glass",
    "thumbnail": "https://...",
    "ingredients": [
      { "name": "Tequila", "measure": "1 1/2 oz" },
      { "name": "Triple sec", "measure": "1/2 oz" }
    ]
  }
]
```

Responses are cached in memory per letter for 10 minutes. Invalid `letter` values return
`400`; upstream errors return `502`.

## Scripts

| Script                 | What it does                           |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | Start the server with `node --watch`   |
| `npm start`            | Start the server without watch         |
| `npm run lint`         | Run ESLint                             |
| `npm run lint:fix`     | Run ESLint with `--fix`                |
| `npm run format`       | Write Prettier formatting              |
| `npm run format:check` | Check Prettier formatting (used in CI) |
| `npm test`             | Run Vitest once                        |
| `npm run test:watch`   | Run Vitest in watch mode               |

## Project layout

```
public/
  index.html          # Static UI with "Cargar cócteles" and "Descargar JSON"
src/
  app.js              # Express app factory (testable, no listen)
  server.js           # Entrypoint: creates app and listens on PORT
  config/
    env.js            # Typed env loader (dotenv)
  routes/
    index.js          # GET /api  (metadata)
    health.js         # GET /health
    cocktails.js      # GET /api/cocktails?letter={a-z}
  middleware/
    notFound.js       # 404 JSON handler
    errorHandler.js   # Centralized error handler
tests/
  root.test.js
  health.test.js
  cocktails.test.js
```

## Environment variables

| Name       | Default       | Description                     |
| ---------- | ------------- | ------------------------------- |
| `NODE_ENV` | `development` | Runtime environment             |
| `PORT`     | `3000`        | Port the HTTP server listens on |

## Git hooks

`husky` installs two hooks via `npm install`:

- **pre-commit**: runs `lint-staged` (ESLint + Prettier on staged files).
- **commit-msg**: validates commit messages with `commitlint` (Conventional Commits).

## License

Unlicensed — add one when the project grows beyond a personal sandbox.
