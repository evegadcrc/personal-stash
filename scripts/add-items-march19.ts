import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OWNER = "edwin.vega@gmail.com";

const items = [
  {
    id: "cbb724f6-f8a5-43e0-b464-448f982d39f8",
    ownerEmail: OWNER,
    title: "5 mejores películas que te vuelan la cabeza en Netflix",
    url: "https://www.facebook.com/reel/884359517846644",
    summary: "Un reel de Facebook por Julio Marín García recomendando 5 películas de Netflix que sorprenden al espectador con giros inesperados o narrativas que rompen esquemas. Una selección curada para quienes buscan algo más allá de los títulos populares de la plataforma.",
    category: "movies",
    subcategory: "recommendation",
    tags: ["netflix", "mind-bending", "recomendaciones", "julio-marin"],
    source: "facebook",
    read: false,
    dateAdded: new Date("2026-03-19T00:00:00Z"),
  },
  {
    id: "675db765-c031-4f9c-bcad-aeb79a0e981d",
    ownerEmail: OWNER,
    title: "Superpowers — Agentic Skills Framework for AI Coding Agents",
    url: "https://github.com/obra/superpowers",
    summary: "An open-source development methodology and skills framework for AI coding agents (Claude Code, Codex, OpenCode) with 40.9K GitHub stars. Before writing any code, the agent brainstorms and refines a spec with you, creates a detailed implementation plan, then executes via subagents with two-stage code review per task. Enforces true TDD: write failing test → watch it fail → write minimal code → watch it pass → commit. Philosophy: systematic over ad-hoc, evidence over claims, verify before declaring success. MIT licensed.",
    category: "ai",
    subcategory: "tool",
    tags: ["claude-code", "agentic", "open-source", "tdd", "methodology"],
    source: "facebook",
    read: false,
    color: "blue",
    content: "**Repo:** https://github.com/obra/superpowers\n**Stars:** 40.9K\n**License:** MIT\n\n## What it does\n- Brainstorms + refines spec with you before writing any code\n- Creates a detailed implementation plan (junior-engineer-proof)\n- Subagent-driven execution — fresh subagents per task\n- Two-stage code review after each task (spec compliance → code quality)\n- Enforces TDD: failing test → pass → commit — deletes code written before tests\n- End-of-task verification and cleanup\n\n## Compatible with\nClaude Code (plugin install), Codex, OpenCode",
    dateAdded: new Date("2026-03-19T00:00:00Z"),
  },
];

async function main() {
  for (const item of items) {
    const existing = await prisma.item.findUnique({ where: { id: item.id } });
    if (existing) {
      console.log(`SKIP (already exists): ${item.title}`);
      continue;
    }
    await prisma.item.create({ data: item });
    console.log(`ADDED: ${item.title}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
