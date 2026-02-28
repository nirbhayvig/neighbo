import { Hono } from "hono"

const health = new Hono().get("/", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
)

export { health }
