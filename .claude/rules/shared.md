---
paths: packages/shared/src/**
---

# Shared Package Rules — `packages/shared`

`packages/shared` is the **single source of truth** for data shapes used across the monorepo. Both `apps/api` and `apps/web` import from here. Any type or schema defined here is automatically available to both apps.

## What Goes Here
- **Zod schemas** — validation schemas shared between API and frontend
- **TypeScript types** — derived from Zod schemas or standalone types
- Nothing else — no UI components, no business logic, no API calls

## Schema Conventions

All schemas live in `packages/shared/src/schemas/`. Group by domain (e.g., `user.ts`, `restaurant.ts`, `report.ts`).

<required>
Always derive TypeScript types from Zod schemas using `z.infer` — never write duplicate standalone types for things that have a schema.
</required>

<examples>
<good>
```typescript
// Schema first, type derived
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
})
export type User = z.infer<typeof userSchema>
```
</good>
<bad>
```typescript
// Do not manually duplicate types that have a schema
export type User = {
  id: string
  email: string
  role: UserRole
}
```
</bad>
</examples>

### Mutation Schemas
Derive create/update schemas from the base schema to avoid duplication:

```typescript
export const createUserSchema = userSchema.omit({ id: true })
export const updateUserSchema = userSchema.partial().omit({ id: true })
```

## Type Conventions

Types that have no corresponding Zod schema (e.g., UI-only types, enum-like literals) live in `packages/shared/src/types/`. Group by domain, mirroring the schema directory structure.

## Export Patterns

The package has three export paths — always re-export through the barrel `index.ts` files:

| Import | Source |
|--------|--------|
| `@neighbo/shared` | `src/index.ts` (everything) |
| `@neighbo/shared/schemas` | `src/schemas/index.ts` |
| `@neighbo/shared/types` | `src/types/index.ts` |

```typescript
// src/schemas/index.ts — barrel pattern
export * from "./user"
export * from "./restaurant"  // add new schema files here
```

## Adding a New Domain

When adding schemas/types for a new entity (e.g., `restaurant`):

1. Create `packages/shared/src/schemas/restaurant.ts` with Zod schemas
2. Create `packages/shared/src/types/restaurant.ts` only if standalone types are needed
3. Re-export from `packages/shared/src/schemas/index.ts` and `packages/shared/src/types/index.ts`
4. The new schemas are immediately available to both `apps/api` and `apps/web`

## Reference Files
- Existing schema example: `packages/shared/src/schemas/user.ts`
- Existing type example: `packages/shared/src/types/user.ts`
- Schema barrel: `packages/shared/src/schemas/index.ts`
- Package entry: `packages/shared/src/index.ts`
