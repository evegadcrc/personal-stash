# Stash — Personal Knowledge Base

A private, self-hosted knowledge base for saving and organizing links, notes, ideas, movies, places, and anything worth keeping.

## How it works

- **Input:** Claude Code in the terminal — paste a link, text snippet, or image and it gets analyzed, categorized, and saved automatically.
- **Storage:** JSON files in `data/users/<email>/`, versioned in git and auto-deployed to Vercel on every push.
- **UI:** Next.js web app hosted on Vercel — browse, search, filter, edit, and reorder saved items.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4
- **Auth:** NextAuth.js v5 (Google OAuth, JWT sessions, email whitelist)
- **AI:** Anthropic Claude (claude-haiku) for auto-analysis of URLs, text, and images
- **Storage:** JSON files (`data/users/<email>/<category>.json`), no database
- **Deploy:** Vercel (auto-deploy on git push)

## Features

- Google OAuth login with email whitelist — per-user data isolation
- Auto-analyze items via AI: paste a URL or text and Claude infers title, summary, category, and tags
- 6 visual themes (dark, light, ocean, forest, sunset, tokyo)
- Grid and list views, persisted across sessions
- Drag-to-reorder cards within a category
- Color-flag cards (rose / amber / blue) for priority, sortable by color
- Search, filter by subcategory and tag
- Mark items as read/unread
- Expand cards inline (ESC or click outside to close)

## Development

```bash
npm install
npm run dev       # localhost:3000
npm run build     # production build
```

## Environment variables

```
ANTHROPIC_API_KEY=
AUTH_SECRET=          # openssl rand -hex 32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ALLOWED_EMAILS=you@gmail.com,other@gmail.com
```

## Adding items

Claude Code is the primary input interface — see `CLAUDE.md` for the workflow.
