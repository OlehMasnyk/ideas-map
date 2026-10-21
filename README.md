# ideas-map: Demand Map

A web app where people drop a pin on a map saying _"I want a cafe (or gym, bakery, pharmacy...) within 500 m of here"_. Entrepreneurs can then explore a heatmap of that demand, filter by category, and click any spot to see how many people want what there, so they know where to open a business.

![Heatmap of demand](docs/heatmap.png)

## Features

- **Map with demand heatmap or clusters.** Requests are aggregated into grid cells on the server, so the map stays fast with large datasets. Exact locations are never shown publicly: cells stop shrinking at about 150 m.
- **Category filter:** cafe, restaurant, grocery, pharmacy, gym, bakery, kids, other.
- **Point insight:** click anywhere to see how many requests have a radius that covers that spot, broken down by category.
- **Add a request:** drop a pin, set a radius between 100 m and 3 km (drawn on the map), pick a category, and add an optional comment.
- **My requests:** list your requests, jump to one on the map, or delete it.
- **Accounts:** email and password with a JWT in an httpOnly cookie. Each user can have at most 5 requests per category, which limits spam.
- **Rate limiting** on the whole API, plus stricter limits on login/register and on creating requests.

## Tech stack

| Layer    | Choice                                                            |
| -------- | ----------------------------------------------------------------- |
| Backend  | Node.js, TypeScript, Express 5, zod                               |
| Database | PostgreSQL + PostGIS, via Prisma (raw SQL for spatial queries)    |
| Frontend | React 19, Vite, react-leaflet, leaflet.heat, OpenStreetMap tiles  |
| Tests    | Vitest, Supertest (API, against a real database), Testing Library |

The repo is an npm-workspaces monorepo:

```
apps/server       Express API, Prisma schema, migrations and seed scripts
apps/web          React single-page app
packages/shared   Categories, limits, zod schemas and API types shared by both
```

## Getting started

Requirements: Node.js 20.11+ and either Docker or a local PostgreSQL 14+ with PostGIS.

```bash
npm install                      # also builds packages/shared and generates the Prisma client
npm run db:up                    # starts PostGIS in Docker on localhost:5432
cp apps/server/.env.example apps/server/.env
npm run db:migrate               # applies migrations (also enables the postgis extension)
npm run db:seed                  # inserts the categories
npm run db:seed:demo             # optional: about 1,500 fake requests around Berlin
npm run dev                      # API on :4000, web app on http://localhost:5173
```

With the demo data loaded, you can sign in as `demo1@demo.demand-map.local` / `demo-password`. Running `db:seed:demo` again replaces the previous demo data.

### Without Docker

Create a database and a user that is allowed to run `CREATE EXTENSION postgis` (or create the extension yourself), then point `DATABASE_URL` in `apps/server/.env` at it.

```bash
sudo -u postgres psql -c "CREATE USER ideas WITH PASSWORD 'ideas' SUPERUSER;" \
                      -c "CREATE DATABASE ideas_map OWNER ideas;"
```

## Scripts

| Command             | What it does                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`       | Runs the API (tsx watch) and the Vite dev server together                                    |
| `npm run build`     | Builds the shared package, the server (`apps/server/dist`) and the web app (`apps/web/dist`) |
| `npm start`         | Runs the built server. It also serves `apps/web/dist` when present.                          |
| `npm test`          | Runs all tests (server tests need PostgreSQL, see below)                                     |
| `npm run lint`      | ESLint                                                                                       |
| `npm run typecheck` | TypeScript in all workspaces                                                                 |
| `npm run format`    | Prettier                                                                                     |

### Tests

Server tests run against a real PostGIS database, by default `postgresql://ideas:ideas@localhost:5432/ideas_map_test`. You can override it with `TEST_DATABASE_URL`. Migrations and the category seed are applied automatically, and the tests truncate the `users` and `demand_requests` tables, so don't point them at your dev database.

```bash
createdb -U ideas ideas_map_test   # or: docker compose exec db createdb -U ideas ideas_map_test
npm test
```

## Configuration (`apps/server/.env`)

| Variable       | Default           | Notes                                             |
| -------------- | ----------------- | ------------------------------------------------- |
| `DATABASE_URL` | none              | PostgreSQL connection string                      |
| `JWT_SECRET`   | dev-only fallback | **Required** when `NODE_ENV=production`           |
| `PORT`         | `4000`            |                                                   |
| `NODE_ENV`     | `development`     | In `production`, auth cookies are marked `Secure` |
| `WEB_DIST_DIR` | `apps/web/dist`   | Static files to serve alongside the API           |

## API

All endpoints are under `/api`. Bodies are JSON. Errors look like `{ "error": "...", "details"?: { field: [messages] } }`.

| Method | Path             | Auth | Description                                                                                                                          |
| ------ | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/auth/register` |      | `{ email, password }`, creates the account and sets the session cookie                                                               |
| POST   | `/auth/login`    |      | `{ email, password }`                                                                                                                |
| POST   | `/auth/logout`   |      | Clears the cookie                                                                                                                    |
| GET    | `/auth/me`       |      | Current user, or `null`                                                                                                              |
| GET    | `/categories`    |      | List of categories                                                                                                                   |
| POST   | `/requests`      | yes  | `{ category, lat, lng, radiusMeters, comment? }`                                                                                     |
| GET    | `/requests/mine` | yes  | Your requests                                                                                                                        |
| DELETE | `/requests/:id`  | yes  | Delete one of your requests                                                                                                          |
| GET    | `/demand`        |      | `?bbox=minLng,minLat,maxLng,maxLat&zoom=14&category=cafe` returns `{ cellSizeDegrees, cells: [{ lat, lng, count, avgRadius }] }`     |
| GET    | `/demand/point`  |      | `?lat=&lng=&category=` returns `{ total, categories: [{ category, name, icon, count }] }` for requests whose radius covers the point |

## How demand is calculated

- **Heatmap and clusters:** request locations are snapped to a grid with `ST_SnapToGrid`. The cell size is about a quarter of a map tile at the current zoom, with a minimum of about 150 m. Each cell reports the number of requests and their average radius.
- **Demand at a spot:** the number of requests with `ST_DWithin(location, spot, radius_meters)`, i.e. whose circle contains the spot. A GiST index on `location`, together with a pre-filter at the maximum radius of 3 km, keeps this fast.

## Ideas for later

- Overlay existing businesses from OpenStreetMap (Overpass API) to show demand minus supply
- Let people upvote a nearby request instead of creating a duplicate
- Let business owners mark "I opened a cafe here" and notify the people who asked for it
- Deployment (Render or Fly.io with managed Postgres), OAuth login, and a multi-language UI
