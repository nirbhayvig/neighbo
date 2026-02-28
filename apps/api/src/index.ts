import { app } from "./app"

const port = Number(process.env["PORT"] ?? 3001)

console.info(`API server running at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
