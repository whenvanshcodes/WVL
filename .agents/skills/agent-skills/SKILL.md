---
name: agent-skills
description: Agent Skills format specification, best practices, authoring, and validation based on agentskills.io and open standards. Use when creating, modifying, testing, or reviewing Agent Skills (SKILL.md, progressive disclosure, scripts, references).
---

# Agent Skills Standard (agentskills.io)

Agent Skills is an open, standardized format for packaging procedural knowledge, instructions, scripts, and domain expertise for AI agents.

## Directory Structure

A standardized agent skill directory looks like:
```text
<skill_name>/
├── SKILL.md          # Required: YAML frontmatter + Markdown instructions
├── scripts/          # Optional: Executable automation scripts (.py, .sh, .js, .ps1)
├── references/       # Optional: In-depth reference docs, API specs, guidelines
├── assets/           # Optional: Templates, images, starter code, sample data
└── tests/            # Optional: Test fixtures and eval suites
```

## SKILL.md Format Specification

The `SKILL.md` file MUST start with a YAML frontmatter block:

```markdown
---
name: my-skill-name
description: >-
  Actionable description explaining what the skill does and when the agent should activate it.
  Use third-person triggers, keywords, and specific use cases.
---

# Skill Title

Clear, procedural instructions for the agent.
```

### Frontmatter Fields
- `name` (string, required): Lowercase, hyphen-delimited unique identifier (e.g., `git-workflow`, `android-developer`).
- `description` (string, required): The description is the sole information available to the agent at Discovery time. It must be specific, include clear trigger conditions, and explain the domain scope.

## Progressive Disclosure Model

Skills load in three distinct stages to preserve context window limits:
1. **Discovery**: At session start, the agent only reads the `name` and `description` of each installed skill.
2. **Activation**: When a user's prompt or task matches the `description`, the agent loads the full `SKILL.md` instructions into active context.
3. **Execution**: The agent follows the instructions, reading secondary files in `references/` or running scripts in `scripts/` only when needed.

## Best Practices for Authoring Skills

1. **Deterministic Triggers**: State exact phrases, keywords, and scenarios in the description (e.g., "Use when the user asks to analyze SEO, audit schema, or optimize Core Web Vitals").
2. **Modular References**: Keep `SKILL.md` focused on procedural steps. Offload large manuals or API tables into `references/` so they are read on demand.
3. **Robust Tooling**: Bundle deterministic scripts in `scripts/` for tasks that require exact computation or file inspection.
4. **Validation & Checks**: Every step should indicate how the agent can verify success before proceeding.
