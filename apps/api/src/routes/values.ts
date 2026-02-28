import { Hono } from "hono"
import type { AppEnv } from "../lib/types"

export const valuesRoutes = new Hono<AppEnv>().get("/", (c) => c.json({ values: [] }))
