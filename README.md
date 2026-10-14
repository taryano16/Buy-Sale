# Second Story

A small neighborhood buy-and-sell marketplace built with plain HTML, CSS, and JavaScript, backed by Node.js and Express.

## Run it

```sh
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000). Use `npm run dev` to restart the server automatically while editing.

## Deploy to Render

1. Push this project to a GitHub or GitLab repository.
2. In Render, choose **New** > **Blueprint**, connect the repository, and apply the configuration in `render.yaml`.
3. Render builds with `npm ci`, starts with `npm start`, and checks `/api/health`. When deployment finishes, open the service's `onrender.com` URL.

The Blueprint uses Render's free web-service plan. Free services can spin down when idle, so the first request after a quiet period may take a little longer. The free service filesystem is ephemeral: new listings written to `data/listings.json` may be lost when the service restarts or deploys. The bundled sample listings return with the deployed code, but durable user listings require an external persistent database or storage service.

## API

- `GET /api/listings?q=lamp&category=Home%20%26%20Living&sort=price-low` searches, filters, and sorts listings.
- `GET /api/listings/:id` returns one listing.
- `POST /api/listings` creates a listing. Required fields: `title`, `price`, `category`, `description`, and `location`; `image` is an optional http(s) URL.

Listings are stored in `data/listings.json`. Set `PORT` or `LISTINGS_FILE` to override the defaults when deploying or testing.

## Test

```sh
npm test
```