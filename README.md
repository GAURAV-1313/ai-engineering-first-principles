# AI Engineering from First Principles

A free study guide to AI engineering: 34 chapters on LLM basics, tokenization, embeddings, RAG, evals, agents, MCP and
production LLM systems, written from first principles for AI-engineer work and interviews. Real code from my projects
sits in the margin of each chapter ("In your code", tagged solid / naive / missing).

**Read it:** https://ai-engineering-first-principles.netlify.app

## Run it

```bash
npm install
npm run setup     # once: vendors the open-licence library sources at pinned commits (needs network)
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
```

## What is in it

| Part | Where |
|---|---|
| 34 chapters (mechanism, production concerns, interview Q&A, Apply-it, "Your project") | `src/content/chapters/` |
| Interview hub: fast track, core-25 one-minute answers, 12 system-design drills | `/interview/`, `data/core25.json`, `src/content/drills/` |
| Code examples from my projects, mapped to chapters | `evidence/*.json`, `data/repos.config.json` |
| Gaps (what none of the projects does yet), project pages, ⌘K search | `/gaps/`, `/repos/` |
| Library: open-licence chapters by other authors, with attribution | `/library/`, `data/library.config.json` |

Project names are replaced with descriptive labels (Memory Agent, Chat Insights / LeetCode Coach, Health Triage,
Certificate Assistant, Answer Grader, Scheme Assistant) and their source links are left out.

## Checks

```bash
node scripts/check-chapter.mjs src/content/chapters/<file>.mdx   # one chapter's structure and length
node scripts/check-outline.mjs --strict                          # every outline section has its heading
```
