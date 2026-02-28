# AI Rule Authoring Guide

> **Purpose**: This document establishes patterns and best practices for creating and maintaining AI agent rules for **Cursor**, **Claude Code**, **ChatGPT Codex**, and **GitHub Copilot**. When updating rules for one agent, corresponding rules should be updated for the others to maintain parity across all four systems.

---

## Table of Contents

1. [Philosophy & Core Principles](#philosophy--core-principles)
2. [Directory Structure](#directory-structure)
3. [Work Documentation & Planning Files](#work-documentation--planning-files)
4. [Cursor Rules (MDC Format)](#cursor-rules-mdc-format)
5. [Claude Rules (CLAUDE.md & .claude/)](#claude-rules-claudemd--claude)
6. [ChatGPT Codex Rules (AGENTS.md & .codex/)](#chatgpt-codex-rules-agentsmd--codex)
7. [Cross-Reference Mapping](#cross-reference-mapping)
8. [Writing Effective Rules](#writing-effective-rules)
9. [Token Efficiency Strategies](#token-efficiency-strategies)
10. [Common Patterns & Templates](#common-patterns--templates)
11. [Maintenance Workflow](#maintenance-workflow)
12. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Philosophy & Core Principles

### The Golden Rule
**Rules should be specific, actionable, and project-unique.** Generic instructions like "write clean code" waste tokens and provide no value. Only include instructions that are specific to THIS project.

### Three Levels of Instruction

| Level | Description | Cursor | Claude | Codex |
|-------|-------------|--------|--------|-------|
| **MUST** | CI-enforced, non-negotiable | Bold + explicit | XML `<required>` tags | Bold + imperative commands |
| **SHOULD** | Strongly recommended | Regular bullets | Standard bullets | Declarative bullets |
| **MAY** | Optional best practices | Lighter mention | `<preferred>` tags | Lighter mention |

### Token Economy Mindset
Every word costs tokens. Rules are loaded into context with every request. Bloated rules = expensive sessions + noisy context. Target:
- Individual rule files: **< 500 lines**
- Total always-applied content: **< 100 lines**
- CLAUDE.md: **< 5,000 tokens** (roughly 10KB)
- AGENTS.md (root): **< 5,000 tokens** (roughly 10KB)
- AGENTS.md (nested): **< 2,500 tokens** (roughly 5KB each)

---

## Directory Structure

### Required Project Structure

```
project-root/
├── .cursor/
│   └── rules/
│       ├── general.mdc           # alwaysApply: true (minimal)
│       ├── api.mdc               # globs: controllers
│       ├── service.mdc           # globs: services
│       ├── testing.mdc           # globs: test files
│       ├── integration.mdc       # globs: integration tests
│       └── [domain].mdc          # Additional domain rules
│
├── .claude/
│   ├── settings.json             # Shared team settings (git tracked)
│   ├── settings.local.json       # Personal settings (gitignored)
│   ├── rules/                    # Modular rules (like Cursor)
│   │   ├── api.md
│   │   ├── service.md
│   │   └── testing.md
│   ├── commands/                 # Custom slash commands
│   │   ├── test.md
│   │   ├── lint.md
│   │   └── deploy.md
│   └── agents/                   # Custom subagents (optional)
│
├── .codex/                       # Codex configuration
│   └── config.toml               # Project-specific config (TOML format)
│
├── CLAUDE.md                     # Main Claude memory file
├── CLAUDE.local.md               # Personal Claude memory (gitignored)
├── AGENTS.md                     # Root Codex instructions (universal standard)
├── packages/
│   ├── frontend/
│   │   └── AGENTS.md             # Frontend-specific Codex instructions
│   └── backend/
│       └── AGENTS.md             # Backend-specific Codex instructions
│
├── docs/
│   └── plans/                    # Agent work documentation (gitignored)
│       ├── .gitkeep
│       ├── *-PLAN.md            # Implementation plans (gitignored)
│       └── *-ORCHESTRATOR.md    # Execution orchestrators (gitignored)
│
├── .codexignore                  # Files to exclude from Codex context
└── .gitignore                    # Must include Claude/Codex local files
```

### .gitignore Additions

```gitignore
# Claude Code local files
CLAUDE.local.md
.claude/settings.local.json
.claude/*.local.md

# Codex local files
AGENTS.override.md
**/AGENTS.override.md
.codex/cache/
.codex/logs/
.codex/temp/
config.local.toml

# Generated plan and orchestrator files
docs/plans/*-PLAN.md
docs/plans/*-ORCHESTRATOR.md
```

---

## Work Documentation & Planning Files

### The Golden Rule for All Agents
**Whenever you (Cursor, Claude Code, or Codex) create a markdown file documenting work you are doing**, that file **MUST** be placed in the `docs/plans/` directory.

This applies to:
- Implementation plans
- Work orchestration documents
- Task breakdowns
- Architecture decision records (for tasks)
- Progress tracking documents
- Any other markdown files about coding work

### Purpose
- **Centralized Location**: All agent-generated work documentation lives in one place
- **Gitignored**: Plan files (`*-PLAN.md` and `*-ORCHESTRATOR.md`) are automatically gitignored
- **Organized**: Prevents scattered markdown files throughout the codebase
- **Discoverable**: Team members know where to find agent work documentation

### Naming Conventions

| File Type | Pattern | Example | Gitignored |
|-----------|---------|---------|------------|
| Implementation Plans | `[task-name]-PLAN.md` | `dark-mode-PLAN.md` | ✅ Yes |
| Orchestrators | `[task-name]-ORCHESTRATOR.md` | `dark-mode-ORCHESTRATOR.md` | ✅ Yes |
| Other Work Docs | `[descriptive-name].md` | `refactor-notes.md` | ❌ No (manual) |

**Note**: Use kebab-case for filenames (e.g., `user-auth-PLAN.md`, not `UserAuth-PLAN.md`)

### For Cursor Users
When creating work documentation:
```markdown
<!-- Save to: docs/plans/[task-name]-PLAN.md -->
# Task Implementation Plan
...
```

### For Claude Code Users
When using the `/plan` command or creating work docs:
1. Use EnterPlanMode tool (creates in restricted directory)
2. After exiting plan mode, copy to `docs/plans/`
3. Follow naming conventions above

### For Codex Users
When creating Plans.md or work documentation:
```bash
# Save your plan to the plans directory
# File: docs/plans/[task-name]-PLAN.md
```

### Directory Structure
```
docs/
└── plans/
    ├── .gitkeep                        # Keeps directory in git
    ├── dark-mode-PLAN.md              # Gitignored
    ├── dark-mode-ORCHESTRATOR.md      # Gitignored
    ├── api-refactor-PLAN.md           # Gitignored
    └── api-refactor-ORCHESTRATOR.md   # Gitignored
```

### What NOT to Put Here
- **Permanent documentation** → Use appropriate docs folders (e.g., `docs/api/`, `docs/architecture/`)
- **Package READMEs** → Keep in package root (`packages/*/README.md`)
- **API documentation** → Use `src/api/docs/` or similar
- **Claude/Cursor/Codex rules** → Use `.claude/`, `.cursor/`, `AGENTS.md` respectively

### Exception: Permanent Work Documentation
If a plan or work document needs to be **committed and preserved** (e.g., major architectural decision):
1. Create it in `docs/plans/` initially
2. When finalized, move to appropriate permanent location (e.g., `docs/architecture/`)
3. Update references accordingly

---

## Cursor Rules (MDC Format)

### File Format Specification

```yaml
---
description: "Human-readable explanation for Agent Requested rules"
globs:
  - "pattern/one/**/*.kt"
  - "pattern/two/**/*.kt"
alwaysApply: false
---

# Rule Title

## Section Heading
- Bullet point instructions
- Another instruction

## Code Examples
```kotlin
// Good example
val correct = doThingRight()

// Bad example
val wrong = doThingWrong()
```
```

### Header Field Reference

| Field | Type | Purpose | When to Use |
|-------|------|---------|-------------|
| `description` | string | Explains rule purpose for AI selection | Agent Requested rules (AI decides when to apply) |
| `globs` | array | File patterns for automatic attachment | Auto Attached rules (apply when files match) |
| `alwaysApply` | boolean | Include in every conversation | Universal standards only (use sparingly!) |

### Rule Type Decision Matrix

```
Is this rule UNIVERSAL to all code in the project?
├─ YES → alwaysApply: true
│        • Keep under 50 lines
│        • Only tech stack, commands, critical conventions
│        • NO description or globs needed
│
└─ NO  → alwaysApply: false
         │
         ├─ Does it apply to SPECIFIC FILE TYPES?
         │  └─ YES → Use globs (Auto Attached)
         │           • Be specific: "src/services/**/*.kt" not "**/*.kt"
         │           • NO description field (crowds agent decisions)
         │
         └─ Does it apply to SPECIFIC TASKS/CONTEXTS?
            └─ YES → Use description (Agent Requested)
                     • Write clear trigger description
                     • NO globs field
```

### Glob Pattern Reference

| Pattern | Matches |
|---------|---------|
| `**/*.kt` | All Kotlin files anywhere |
| `src/main/**/*.kt` | Kotlin files in main source |
| `src/test/**/*.kt` | All test files |
| `**/controllers/**/*.kt` | Controller files at any depth |
| `!**/generated/**` | Exclude generated files |

**Important**: Brace expansion `{ts,tsx}` is NOT reliably supported. Use separate array entries instead.

### Cursor Rule Template

```yaml
---
description: [RULE_DESCRIPTION]
globs:
  - "[GLOB_PATTERN]"
alwaysApply: false
---

# [Rule Title]

## Purpose
[One-line explanation of what this rule governs]

## Patterns

### DO
- [Specific action to take]
- [Another action]

### DON'T
- [Specific thing to avoid]
- [Another anti-pattern]

## Examples

### Correct
```[language]
[Good code example]
```

### Incorrect
```[language]
[Bad code example with explanation]
```

## Reference Files
@[path/to/example-file.kt]

## Related Rules
- See `[other-rule].mdc` for [related topic]
```

---

## Claude Rules (CLAUDE.md & .claude/)

### CLAUDE.md File Structure

```markdown
# Project: [Project Name]

## Stack
- [Language] [Version]
- [Framework] [Version]
- [Database] [Version]
- [Other key technologies]

## Architecture
```
[Brief ASCII directory structure]
```

## Commands
- Build: `[command]`
- Test: `[command]`
- Lint: `[command]`
- Coverage: `[command]`

## MUST Rules (CI-enforced)
<required>
- [Non-negotiable rule 1]
- [Non-negotiable rule 2]
</required>

## SHOULD Rules
- [Recommended practice 1]
- [Recommended practice 2]

## Project-Specific Notes
- [Unusual behavior or gotcha]
- [Important architectural decision]

## File References
- API patterns: @docs/api-guide.md
- Testing: @docs/testing-guide.md
```

### XML Tags for Structure (Recommended)

Claude handles XML tags particularly well. Use them for semantic structure:

```xml
<required>
  Rules that MUST be followed (CI-enforced)
</required>

<preferred>
  Rules that SHOULD be followed (strongly recommended)
</preferred>

<forbidden>
  Patterns that must NEVER be used
</forbidden>

<examples>
  <good>Correct implementation</good>
  <bad>Incorrect implementation</bad>
</examples>
```

### .claude/rules/ Directory (Path-Specific Rules)

For rules that apply to specific files, use the `.claude/rules/` directory with YAML frontmatter:

```markdown
---
paths: src/main/kotlin/com/project/services/**/*.kt
---

# Service Layer Rules

## Dependency Injection
- Use constructor injection exclusively
- Avoid field injection with @Inject

## Reactive Patterns
- Return Mono/Flux from all public methods
- Never call .block() in production code
```

### .claude/commands/ (Custom Slash Commands)

Create reusable prompts as markdown files:

**`.claude/commands/test.md`**:
```markdown
---
description: Run tests for changed files
allowed-tools: Bash(./gradlew:*), Read
---

## Context
- Current changes: !`git diff --name-only HEAD`

## Task
Run appropriate tests for the changed files:
1. If Kotlin files changed in src/main, run unit tests
2. If integration test files changed, run integration tests
3. Report results and any failures
```

**`.claude/commands/review.md`**:
```markdown
---
description: Code review for current changes
allowed-tools: Read, Grep, Glob
---

Review the current changes for:
1. Code style violations
2. Security issues (SQL injection, XSS, secrets in code)
3. Missing tests
4. Performance concerns

Provide specific, actionable feedback.
```

### .claude/settings.json

```json
{
  "permissions": {
    "allow": [
      "Bash(./gradlew:*)",
      "Bash(git:*)",
      "Bash(docker:*)",
      "Read(src/**)",
      "Write(src/**)",
      "Edit(src/**)"
    ],
    "deny": [
      "Read(.env*)",
      "Read(**/secrets/**)",
      "Bash(rm -rf:*)",
      "Bash(sudo:*)"
    ]
  },
  "env": {
    "JAVA_HOME": "/usr/lib/jvm/java-21"
  }
}
```

---

## ChatGPT Codex Rules (AGENTS.md & .codex/)

### AGENTS.md: The Universal Standard

**AGENTS.md is the emerging cross-tool standard** for AI coding assistants (Codex, Cursor, GitHub Copilot, and more). Unlike Cursor's MDC format or Claude's proprietary CLAUDE.md, AGENTS.md uses **plain Markdown with NO required frontmatter**, making it the most portable format.

### Core Principles

1. **Plain Markdown**: No YAML frontmatter required (though optional for specialized use)
2. **Hierarchical Cascading**: Files from root to leaf directory are merged
3. **Override Mechanism**: `AGENTS.override.md` takes precedence over `AGENTS.md`
4. **Context Compaction**: GPT-5.1-Codex-Max automatically reduces tokens in long sessions

### AGENTS.md File Structure

Based on GitHub's analysis of 2,500+ repositories, successful AGENTS.md files follow six core areas:

```markdown
# AGENTS.md

## Commands
- `pnpm install` - Install dependencies
- `pnpm dev` - Start dev server (port 5173)
- `pnpm test` - Run all tests
- `pnpm build` - Production build

## Testing
- Run `pnpm type-check` before PRs (must pass)
- All tests must pass before merge
- Coverage minimum: 80% for new code

## Project Structure
```
packages/
├── shared/    # Shared UI components
├── frontend/  # User app (web + mobile)
└── admin/     # Admin panel (web only)
```

## Code Style
✅ **ALWAYS**:
- Use TypeScript for all files
- Primary color: `bg-primary` (never `bg-blue-500`)
- Named exports over default exports

❌ **NEVER**:
- Commit secrets or API keys
- Use `any` type without justification
- Create files with kebab-case naming

## Git Workflow
- Use conventional commits (feat/fix/docs)
- Create PRs from feature branches
- Squash commits when merging

## Boundaries
✅ **Always do**:
- Write tests for new features
- Follow existing patterns
- Ask before large refactors

⚠️ **Ask first**:
- Architecture changes
- New dependencies
- Breaking changes

🚫 **Never do**:
- Push directly to main
- Skip CI checks
- Modify generated files
```

### Hierarchical Loading System

Codex builds an instruction chain by **walking from project root to current directory**:

```
my-monorepo/
├── AGENTS.md                          # ① Root (loaded first)
├── packages/
│   ├── frontend/
│   │   ├── AGENTS.md                  # ② Frontend package (loaded second)
│   │   └── src/
│   │       └── components/
│   │           └── AGENTS.md          # ③ Component-specific (loaded third)
```

**When editing** `packages/frontend/src/components/Button.tsx`:
1. Loads `~/.codex/AGENTS.md` (global user config)
2. Loads `my-monorepo/AGENTS.md` (root)
3. Loads `my-monorepo/packages/frontend/AGENTS.md` (package)
4. Loads `my-monorepo/packages/frontend/src/components/AGENTS.md` (feature)

**Result**: Instructions cascade with later files taking precedence (root → leaf).

### Override Files

Use `AGENTS.override.md` for team-specific or temporary rules:

```markdown
# AGENTS.override.md (takes precedence over AGENTS.md)

## Temporary Migration Rules
- ⚠️ During v2 migration, use legacy API endpoints
- TODO: Remove after migration completes (2026-02-15)
```

**Precedence order** in each directory:
1. `AGENTS.override.md` (highest priority)
2. `AGENTS.md`
3. Fallback filenames (configurable: `TEAM_GUIDE.md`, `DEV_GUIDE.md`, etc.)

### .codex/config.toml Configuration

Codex uses **TOML format** (not JSON/YAML) for all configuration:

```toml
# .codex/config.toml

# Model Configuration
model = "gpt-5.2-codex"
model_reasoning_effort = "medium"  # minimal, low, medium, high, xhigh

# Security and Approval
approval_policy = "on-request"     # untrusted, on-failure, on-request, never
sandbox_mode = "workspace-write"   # read-only, workspace-write, danger-full-access

# Project Configuration
project_root_markers = [".git", "pnpm-workspace.yaml", "package.json"]
project_doc_max_bytes = 32768      # Max combined AGENTS.md size (32KB default)
project_doc_fallback_filenames = ["TEAM_GUIDE.md", "DEV_GUIDE.md"]

# Features
[features]
shell_tool = true
web_search_request = true
unified_exec = true

# MCP Server Integration (optional)
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"]
```

**Configuration hierarchy**:
1. System config: `/etc/codex/config.toml` (admin-enforced)
2. User config: `~/.codex/config.toml` (personal defaults)
3. Project config: `.codex/config.toml` (project-specific, overrides above)

### .codexignore File

Similar to `.gitignore`, exclude sensitive files from Codex context:

```
# .codexignore
.env
.env.*
secrets/
*.key
*.pem
config/credentials.json
api-keys.txt
node_modules/
dist/
build/
```

**Note**: Codex automatically respects `.gitignore` patterns. Use `.codexignore` for additional exclusions.

### Codex vs Cursor/Claude Comparison

| Aspect | Codex (AGENTS.md) | Cursor (MDC) | Claude (CLAUDE.md) |
|--------|-------------------|--------------|-------------------|
| **Format** | Plain Markdown | Markdown + YAML frontmatter | Markdown + optional YAML |
| **Frontmatter** | Optional/none | Required | Optional |
| **Loading Strategy** | Directory walk (root→leaf) | Glob patterns + alwaysApply | Glob patterns + imports |
| **Config Format** | TOML | UI settings + MDC | JSON |
| **Override Mechanism** | `AGENTS.override.md` | Separate rule files | `.override.md` files |
| **Size Limit** | 32KB default (configurable) | No explicit limit | No explicit limit |
| **Cross-Tool Support** | ✅ Universal (Codex, Cursor, Copilot) | ⚠️ Cursor-specific | ⚠️ Claude-specific |

### Best Practices for Codex

#### 1. Modular Over Monolithic
✅ **Good**: Nested AGENTS.md files per package/feature
```
project/
├── AGENTS.md                    # 100 lines (universal)
├── packages/frontend/AGENTS.md  # 50 lines (frontend-specific)
└── packages/backend/AGENTS.md   # 50 lines (backend-specific)
```

❌ **Bad**: One giant root file
```
project/
└── AGENTS.md                    # 500 lines (everything)
```

#### 2. Use Headers for Hierarchy
```markdown
## 🚨 CRITICAL (overrides everything)
**ALWAYS** use DateUtils.parseDate()

## ⚠️ Important (strong preference)
Use PascalCase for components

## ℹ️ Guidelines (default patterns)
Prefer named exports

## 📚 Reference (lookup as needed)
See docs/api-guide.md for details
```

#### 3. Progressive Disclosure
Keep root AGENTS.md brief (< 100 lines). Use pointers to deeper docs:

```markdown
## Reference Documentation
- API patterns: `docs/api-guide.md`
- Testing: `docs/testing-guide.md`
- Deployment: `docs/deployment.md`

**Instructions**: Read relevant docs before coding.
```

#### 4. Imperative for Critical Rules
```markdown
## Critical Rules
- **ALWAYS** use `DateUtils.parseDate()` for date parsing
- **NEVER** use `new Date()` with string arguments
- **MUST** run `pnpm type-check` before committing
```

#### 5. Code Examples with DO/DON'T
```markdown
## Date Handling
```typescript
// ✅ DO
const date = DateUtils.parseDate('2025-04-03T14:30:00.000Z');

// ❌ DON'T
const date = new Date('04/03/25');  // Ambiguous
```
```

#### 6. Team Collaboration Pattern
Shift your role from coder to reviewer:
- Let Codex draft implementations
- You review the diff
- Comment on issues
- Ask Codex to revise

### Codex-Specific Tips & Tricks

#### Context Compaction
GPT-5.1-Codex-Max features **automatic context compaction**:
- Works across millions of tokens
- Reduces tokens by 20-40% in long sessions
- Enables multi-hour agent loops (24+ hours)
- Preserves most important context

#### Plans.md Technique
For complex projects:
1. Create `Plans.md` in your repo
2. Give Codex a meta-plan (instructions on what makes a good plan)
3. Let Codex create the detailed plan
4. Execute incrementally

#### Socratic Template Method
Make Codex ask YOU questions first:
1. Codex asks clarifying questions
2. You provide context
3. Codex reviews context and writes code
4. Results in better, more targeted code

#### Task Delegation
**Pro tip**: Ask Codex what it should do. Having Codex create tasks for itself improves output quality.

#### Multi-File Refactoring
Context compaction unlocks:
- Repository-scale refactors
- Deep debugging across many files
- Migrations with interconnected changes
- Fewer hallucinations

### Codex Template

```markdown
# AGENTS.md

## Project: [Project Name]

Brief description of what this project does.

## Tech Stack
- [Language] [Version]
- [Framework] [Version]
- [Database] [Version]
- [Other key technologies]

## Architecture
```
[Brief ASCII directory structure]
```

## Commands
- Install: `[command]`
- Dev: `[command]`
- Test: `[command]`
- Build: `[command]`
- Lint: `[command]`

## Testing
- Find CI plan in `.github/workflows/ci.yml`
- Before PRs: Run `[test command]` (must pass)
- Coverage target: [X]%

## Code Style
✅ **ALWAYS**:
- [Specific pattern 1]
- [Specific pattern 2]

❌ **NEVER**:
- [Specific anti-pattern 1]
- [Specific anti-pattern 2]

## Git Workflow
- [Commit conventions]
- [Branch naming]
- [PR requirements]

## Boundaries
✅ **Always do**:
- [Action 1]
- [Action 2]

⚠️ **Ask first**:
- [Action requiring approval]

🚫 **Never do**:
- [Forbidden action 1]
- [Forbidden action 2]

## Project-Specific Notes
- [Unusual behavior or gotcha]
- [Important architectural decision]
```

---

## Cross-Reference Mapping

When creating or updating rules, maintain parity between Cursor, Claude, and Codex:

| Cursor (.cursor/rules/) | Claude Equivalent | Codex Equivalent | Notes |
|-------------------------|-------------------|------------------|-------|
| `general.mdc` (alwaysApply: true) | `CLAUDE.md` root content | Root `AGENTS.md` | All loaded in every session |
| `api.mdc` (globs) | `.claude/rules/api.md` (paths) | Inline section in `AGENTS.md` or nested file | Same content, different syntax |
| `service.mdc` (globs) | `.claude/rules/service.md` (paths) | Inline section in `AGENTS.md` or nested file | Same content, different syntax |
| `testing.mdc` (globs) | `.claude/rules/testing.md` (paths) | `## Testing` section in `AGENTS.md` | Same content, different syntax |
| N/A | `.claude/commands/*.md` | Inline in `AGENTS.md` or use slash commands | Cursor has no direct equivalent |
| N/A | `.claude/settings.json` | `.codex/config.toml` (TOML format) | Cursor uses UI settings |
| N/A | N/A | `AGENTS.override.md` | Codex-specific override mechanism |

### Conversion Guide

**Cursor MDC → Claude MD**:

```yaml
# Cursor: .cursor/rules/api.mdc
---
description: API controller conventions
globs:
  - "src/main/kotlin/**/controllers/**/*.kt"
alwaysApply: false
---
# Content here...
```

Becomes:

```markdown
# Claude: .claude/rules/api.md
---
paths: src/main/kotlin/**/controllers/**/*.kt
---
# Same content here...
```

**Key Differences**:
- Cursor uses `globs:` array, Claude uses `paths:` string
- Cursor uses `description:` for Agent Requested, Claude uses description in `SKILL.md`
- Cursor uses `alwaysApply:`, Claude loads root `CLAUDE.md` always
- Claude supports `@file` imports, Cursor uses `@filename` references

**Cursor/Claude → Codex (AGENTS.md)**:

```yaml
# Cursor/Claude: Multiple specialized files
.cursor/rules/api.mdc
.claude/rules/api.md
```

Becomes:

```markdown
# Codex: AGENTS.md (inline sections or nested files)

## API Conventions

### Controllers
Apply these patterns to all controller files:
- [Same content from api.mdc]

### Services
Apply these patterns to all service files:
- [Same content from service.mdc]
```

**OR** use nested structure for monorepos:

```
project-root/
├── AGENTS.md                     # Universal rules
├── packages/
│   ├── frontend/
│   │   └── AGENTS.md             # Frontend-specific rules (equivalent to frontend.mdc)
│   └── backend/
│       └── AGENTS.md             # Backend-specific rules (equivalent to backend.mdc)
```

**Key Differences**:
- Codex uses **plain Markdown** (no YAML frontmatter required)
- Codex uses **hierarchical cascading** (root → leaf) instead of globs
- Codex prefers **inline sections** over separate files for related rules
- Codex supports `AGENTS.override.md` for temporary/team-specific overrides
- Codex config uses **TOML format** instead of JSON

**Universal Compatibility Strategy**:

To maintain compatibility across all three systems:

1. **Create AGENTS.md** as the source of truth (most portable)
2. **Reference from CLAUDE.md**:
   ```markdown
   # CLAUDE.md
   @import AGENTS.md
   ```
3. **Mirror content in Cursor rules** with appropriate frontmatter
4. **Keep core content identical** across all three formats

This ensures you edit in one place and all tools stay synchronized.

---

## Writing Effective Rules

### Phrasing Hierarchy (Most to Least Effective)

1. **Structured sections with markdown headings**
   ```markdown
   ## Required Patterns
   - Specific instruction

   ## Prohibited Patterns
   - Specific anti-pattern
   ```

2. **Bulleted lists with clear actions**
   ```markdown
   - Use `@Secured` annotation on all endpoints
   - Return `Mono`/`Flux` from all service methods
   ```

3. **DO/DON'T format**
   ```markdown
   DO:
   - Validate all input parameters

   DON'T:
   - Return null from reactive methods
   ```

4. **Code examples with Good/Bad labels**
   ```markdown
   ### Good
   ```kotlin
   return Mono.error(BusinessNotFoundException())
   ```

   ### Bad
   ```kotlin
   return Mono.empty() // Silent failure
   ```
   ```

5. **Bold emphasis for critical points**
   ```markdown
   **NEVER** use `.block()` in production code
   **ALWAYS** wrap blocking calls in `Mono.fromCallable`
   ```

### Content Guidelines

**Include**:
- Specific file paths and package names
- Exact exception class names used in the project
- Actual command strings (`./gradlew test`, not "run tests")
- Real code examples from the codebase
- References to example files with `@path/to/file`

**Exclude**:
- Generic advice ("write clean code", "follow best practices")
- Obvious instructions ("use meaningful variable names")
- Framework documentation (link instead)
- Lengthy explanations (be terse)

### Rule Length Guidelines

| Rule Type | Target Length | Max Length |
|-----------|---------------|------------|
| Always-applied | 20-50 lines | 100 lines |
| File-specific | 30-80 lines | 150 lines |
| Complex domain | 50-100 lines | 200 lines |
| Integration tests | 60-120 lines | 250 lines |

If a rule exceeds max length, split into multiple focused rules.

---

## Token Efficiency Strategies

### Strategy 1: Minimize Always-Applied Rules

**Bad** (in general.mdc):
```yaml
alwaysApply: true
---
[200 lines of content loaded in EVERY conversation]
```

**Good** (in general.mdc):
```yaml
alwaysApply: true
---
# Project Quick Reference
## Stack: Kotlin 2.1, Micronaut 4.4, MySQL, Firebase
## Commands
- Test: `./gradlew test`
- Build: `./gradlew build`
[30 lines total]
```

### Strategy 2: Use Specific Globs

**Bad**: `**/*.kt` (matches everything)
**Good**: `src/main/kotlin/com/project/services/**/*.kt` (matches only services)

### Strategy 3: Reference Files Instead of Copying

**Bad**:
```markdown
## Service Pattern
Here's the complete 50-line example of how to write a service...
[50 lines of code]
```

**Good**:
```markdown
## Service Pattern
Follow the pattern in @src/main/kotlin/com/project/services/ExampleService.kt
Key points:
- Constructor injection
- Reactive return types
- Error handling with domain exceptions
```

### Strategy 4: Progressive Disclosure

For complex topics, reference external files:

```markdown
## Database Patterns
Core rules here (brief)

For detailed documentation:
- Migration patterns: @docs/database-migrations.md
- Query optimization: @docs/query-patterns.md
```

### Strategy 5: Session Management

**For Claude**:
- Use `/clear` between unrelated tasks
- Use `/compact` to retain key context while reducing tokens
- Target 70-75% context usage (quality degrades near 100%)

**For Cursor**:
- Use Agent Requested rules over Always rules
- Disable unused MCP servers
- Keep individual rule files focused

---

## Common Patterns & Templates

### Template: Domain Entity Rules

```yaml
---
description: [Entity] domain patterns
globs:
  - "src/main/kotlin/**/[entity]/**/*.kt"
  - "src/main/kotlin/**/models/[Entity]*.kt"
---

# [Entity] Domain Rules

## Model Structure
- [Field naming conventions]
- [Relationship patterns]
- [Validation requirements]

## Repository Patterns
- [Query patterns]
- [Pagination approach]

## Service Patterns
- [Authorization requirements]
- [Validation sequence]
- [Error handling]

## Exceptions
- `[Entity]NotFoundException` - when [condition]
- `Duplicate[Entity]Exception` - when [condition]
```

### Template: API Endpoint Rules

```yaml
---
description: [Feature] API conventions
globs:
  - "src/main/kotlin/**/controllers/[Feature]Controller.kt"
---

# [Feature] API Rules

## Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/[feature] | Required | List all |
| POST | /api/[feature] | Required | Create new |

## Request/Response DTOs
- Use `[Feature]Request` for input
- Use `[Feature]Response` for output

## Security
- All endpoints require `@Secured(["ROLE"])` unless explicitly public
- Validate [specific validation requirements]

## Error Responses
| Status | Condition |
|--------|-----------|
| 400 | Invalid input |
| 403 | Insufficient permissions |
| 404 | [Entity] not found |
```

### Template: Testing Rules

```yaml
---
description: Testing patterns for [area]
globs:
  - "src/test/kotlin/**/[area]/**/*.kt"
---

# [Area] Testing Rules

## Test Structure
```kotlin
class [Subject]Test {
    @Nested inner class `when [condition]` {
        @Test fun `should [expected behavior]`() { }
    }
}
```

## Setup
- [Required test fixtures]
- [Mock configuration]

## Assertions
- Use StepVerifier for reactive: `mono.verifyComplete { }`
- Use [assertion library] for [type]

## Coverage Requirements
- Minimum: [X]% branch coverage
- Focus on: [specific areas]
```

---

## Maintenance Workflow

### When to Update Rules

1. **After fixing AI mistakes**: If the AI makes a mistake that could be prevented with better instructions, update rules
2. **After framework upgrades**: Update patterns and version numbers
3. **After architectural changes**: Update structure and conventions
4. **After adding new patterns**: Document new approaches
5. **Periodic review**: Quarterly review for staleness

### Update Checklist

- [ ] Update Cursor rule in `.cursor/rules/[name].mdc`
- [ ] Update Claude rule in `.claude/rules/[name].md`
- [ ] Update Codex section in relevant `AGENTS.md` file(s)
- [ ] Update CLAUDE.md if it's a global change
- [ ] Test that glob patterns match intended files (Cursor/Claude)
- [ ] Test that hierarchical loading works correctly (Codex)
- [ ] Verify rule is under length limit
- [ ] Check for obsolete content to remove
- [ ] Update `.codexignore` if adding sensitive file patterns

### Version Control

1. **Commit rules with related code changes**
   ```
   feat: Add user authentication

   - Implement AuthController
   - Add auth service layer
   - Update AI rules for auth patterns
   ```

2. **Review rules in PRs** - rules should be reviewed like code

3. **Track rule effectiveness** - note in commit if a rule prevented previous mistakes

---

## Anti-Patterns to Avoid

### 1. Duplicate Content Between Rules
**Bad**: Same instructions in `service.mdc` and `api.mdc`
**Good**: Put shared content in `general.mdc` (if truly universal) or reference a common file

### 2. Mixing Globs and Description
**Bad**:
```yaml
description: "Service patterns"
globs: ["**/services/**/*.kt"]
```
**Good**: Use one or the other, not both

### 3. Overly Broad Always-Apply
**Bad**: 200-line `general.mdc` with `alwaysApply: true`
**Good**: 30-line `general.mdc` with essentials; detailed rules use globs

### 4. Vague Instructions
**Bad**: "Follow best practices for error handling"
**Good**: "Return `Mono.error(BusinessNotFoundException())` when entity not found"

### 5. Missing Examples
**Bad**: "Use proper DTO patterns"
**Good**: "Use DTOs from `com.project.entities.objects.*` - see `@src/.../UserDTO.kt`"

### 6. Outdated Framework References
**Bad**: Instructions referencing deprecated APIs or old patterns
**Good**: Update rules when upgrading frameworks

### 7. Ignoring the AI's Mistakes
**Bad**: Fixing AI mistakes without updating rules
**Good**: Every repeated mistake should trigger a rule update

### 8. Monolithic Rules
**Bad**: One 500-line file covering everything
**Good**: Multiple focused files with specific globs

### 9. Conflicting Rules
**Bad**: `api.mdc` says "return null", `service.mdc` says "never return null"
**Good**: Consistent guidance across all rules

### 10. Not Testing Globs
**Bad**: Assuming glob patterns work
**Good**: Verify files match with: `git ls-files | grep -E '[pattern]'`

---

## Quick Reference Card

### Cursor MDC Header
```yaml
---
description: "For Agent Requested (AI decides)"
globs: ["pattern/**/*.kt"]     # For Auto Attached
alwaysApply: false             # true only for essentials
---
```

### Claude MD Header
```yaml
---
paths: pattern/**/*.kt         # For path-specific rules
---
```

### Claude CLAUDE.md Import
```markdown
@path/to/file.md               # Import file content
@docs/detailed-guide.md        # Reference documentation
```

### Codex AGENTS.md Structure
```markdown
# AGENTS.md
## Commands
- `pnpm dev` - Start dev server

## Code Style
✅ **ALWAYS**: [critical rules]
❌ **NEVER**: [forbidden patterns]

## Boundaries
✅ Always do | ⚠️ Ask first | 🚫 Never do
```

### Codex config.toml
```toml
# .codex/config.toml
model = "gpt-5.2-codex"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
project_root_markers = [".git", "package.json"]
```

### Decision Quick Reference

| Scenario | Cursor | Claude | Codex |
|----------|--------|--------|-------|
| Global standards | `alwaysApply: true` | Root `CLAUDE.md` | Root `AGENTS.md` |
| File-type specific | `globs:` | `paths:` frontmatter | Nested `AGENTS.md` |
| Task/context specific | `description:` | Skill or command | Inline section |
| Reusable prompts | N/A | `.claude/commands/` | Slash commands |
| Custom workflows | N/A | `.claude/agents/` | Inline or `Plans.md` |
| Override mechanism | Separate files | `.override.md` | `AGENTS.override.md` |

---

## Appendix: Project-Specific Configuration

### Current Sourcecore Structure

```
.cursor/rules/
├── general.mdc         ✓ alwaysApply: true
├── api.mdc             ✓ globs: controllers
├── kotlin-service.mdc  ✓ globs: services
├── testing.mdc         ✓ globs: test files
├── integration-testing.mdc ✓ globs: integration tests
└── reactive.mdc        ✓ globs: services (consider merging)

.claude/                 ✗ NOT YET CREATED
CLAUDE.md               ✗ NOT YET CREATED
```

### Recommended Additions

**Missing Rules** (Cursor, Claude, and Codex):
- `repository.mdc` / `repository.md` / AGENTS.md section - Database/query patterns
- `entities.mdc` / `entities.md` / AGENTS.md section - JPA/Hibernate patterns
- `exception-handling.mdc` / `exception-handling.md` / AGENTS.md section - Global error handling
- `filters.mdc` / `filters.md` / AGENTS.md section - HTTP filter patterns
- `dtos.mdc` / `dtos.md` / AGENTS.md section - DTO validation patterns
- `firebase.mdc` / `firebase.md` / AGENTS.md section - Firebase auth patterns

**Files to Create**:
1. `CLAUDE.md` - Mirror essential content from `general.mdc`
2. `.claude/rules/*.md` - Mirror all Cursor rules
3. `.claude/settings.json` - Permission configuration
4. `.claude/commands/test.md` - Test runner command
5. `.claude/commands/lint.md` - Lint runner command
6. **`AGENTS.md` (root)** - Universal instructions for Codex (and cross-tool compatible)
7. **`packages/frontend/AGENTS.md`** - Frontend-specific Codex rules
8. **`packages/admin/AGENTS.md`** - Admin-specific Codex rules
9. **`.codex/config.toml`** - Project-specific Codex configuration
10. **`.codexignore`** - Exclude sensitive files from Codex context
