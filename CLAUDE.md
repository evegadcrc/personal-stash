# Stash — Personal Knowledge Base

This is a personal knowledge base. Claude Code is the input interface.
The web app at Vercel is the browsing UI. Data lives in `data/users/<email>/<category>.json`, versioned in GitHub.

---

## Workflow for adding a new item

1. User pastes a link, text, or image into the chat
2. If a URL: fetch it with the WebFetch tool to extract title, content, and key info
3. Determine: category, subcategory, title, summary (2–4 sentences), tags, source
4. Read the appropriate `data/users/edwin.vega@gmail.com/<category>.json` file
5. Append the new item to the `items` array (generate a UUID v4 for the `id`)
6. Write the updated file back
7. Run: `git add data/users/edwin.vega@gmail.com/<category>.json && git commit -m "add: <title>" && git push`
8. Vercel redeploys in ~30 seconds — item appears on the live site

---

## Item schema

```json
{
  "id": "uuid-v4",
  "title": "string",
  "url": "string | null",
  "summary": "string (2–4 sentences, Claude-generated, informative and specific)",
  "category": "ai",
  "subcategory": "tutorial",
  "tags": ["string", "max 5 tags"],
  "dateAdded": "2026-03-02T00:00:00Z",
  "content": "string (optional extended markdown notes)",
  "source": "facebook | youtube | twitter | reddit | manual | ...",
  "read": false,
  "color": "rose | amber | blue | (omit if none)"
}
```

**Important:**
- `summary` must be 2–4 complete sentences. Be specific about what makes this item useful.
- `tags` should be lowercase, hyphenated (e.g., `machine-learning`, `open-source`)
- `dateAdded` must be ISO 8601 format with the current date/time
- `content` is optional — use for extra notes, quotes, or markdown content
- `source` describes where you found the link (facebook, youtube, manual, etc.)
- `color` is optional — omit entirely if no priority flag is needed

---

## Categories and subcategories

All data files live under `data/users/edwin.vega@gmail.com/`:

| Category    | File                  | Valid subcategories                                   |
|-------------|-----------------------|-------------------------------------------------------|
| ai          | ai.json               | tool, model, prompt, tutorial, course, research, news |
| movies      | movies.json           | to-watch, watched, series, recommendation             |
| lugares     | lugares.json          | restaurant, travel, experience, coffee                |
| ideas       | ideas.json            | project, business, creative, note                     |
| bookmarks   | bookmarks.json        | reference, article, video, stream, site, jobs, books  |
| restaurants | restaurants.json      | restaurant, bar, event                                |
| sadhguru    | sadhguru.json         | quote                                                 |

**New categories:** If content doesn't fit any existing category, create a new JSON file:
```bash
echo '{"items":[]}' > data/users/edwin.vega@gmail.com/<newcategory>.json
```
The app picks it up automatically at the next build — no code changes needed.

---

## Generating a UUID v4

```bash
python3 -c "import uuid; print(uuid.uuid4())"
```

---

## Example: adding a link

User: "Add this: https://example.com/some-article"

Steps:
1. `WebFetch` the URL to read the content
2. Determine it fits `bookmarks` > `article`
3. Generate UUID, write summary and tags
4. Read `data/users/edwin.vega@gmail.com/bookmarks.json`, append item, write file
5. `git add data/users/edwin.vega@gmail.com/bookmarks.json && git commit -m "add: Title of Article" && git push`

---

## Example: adding a movie to watch

User: "Add Oppenheimer to my to-watch list"

Steps:
1. Look up the film (IMDB or known info)
2. Category: `movies`, subcategory: `to-watch`
3. URL: IMDB link if available
4. Write summary: year, director, premise, why it's notable
5. Append to `data/users/edwin.vega@gmail.com/movies.json` and commit

---

## Tips

- Keep summaries factual and informative, not generic ("This is a great article")
- Tags should help with searching: use the technology name, topic, people involved
- For YouTube videos, use the channel name as a tag
- For places, include the city/country as a tag
- If the user provides notes or a reason for saving, include that in `content`

---

## Fetching URLs

- **Standard URLs:** use the `WebFetch` tool
- **Facebook / login-walled sites:** use the Playwright MCP tool (browser automation) — it can render JS and bypass basic walls
- **Playwright MCP install (global, one-time):**
  ```bash
  claude mcp add --transport stdio --scope user playwright -- npx -y @playwright/mcp@latest
  ```
  Verify with `claude mcp list`. Restart Claude Code after installing.
