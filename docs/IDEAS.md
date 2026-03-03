# Clarity — Feature Ideas Backlog

Running list of ideas not yet scheduled for implementation.

---

## Knowledge Base / How-To Library

**Priority:** Medium-High
**Status:** Idea

### What it is

A personal reference collection — the things you look up once, forget, and have to figure out again six months later. Water softener recharge, sprinkler timer programming, router port forwarding, etc. But also saved learning: articles, YouTube videos, Reddit threads, links you want to be able to ask the AI about.

Two flavors of content:
1. **Procedures / how-tos** — step-by-step instructions you write or paste, optionally with photos or attachments (e.g., "how to recharge the water softener — photos of the salt tank + steps")
2. **Saved references** — links, YouTube videos, Reddit posts, articles — things you've read and want to recall

### Key design decisions

- **Google Drive option:** If a Drive doc already exists for a topic (household manual, checklists, etc.), user can link it instead of re-entering. The integration pulls the doc in as context.
- **Context toggle (per-item):** Off by default. Toggle on = that entry gets included in AI coach prompts. This way you can have 200 items but only wire in 3-4 relevant ones without bloating context.
- **Not always connected:** Whole feature is passive/retrieval by default. AI doesn't know about it unless you flip the switch on specific items.

### Content types
- Text / markdown (written how-to)
- Photos / attachments (images of equipment, diagrams)
- URL / link (article, Reddit post)
- YouTube (video with title + thumbnail)
- Google Drive doc (linked, not copied)

### Use cases
- "How do I recharge the water softener?" → toggle on → ask AI → AI walks you through your own saved steps + photos
- "What was that article about deep work I saved?" → find it, toggle on, ask about it
- "We need to fix the sprinkler timer" → entry with photos of the panel + YouTube video you used last time

### Notes / open questions
- Photos: store in Vercel Blob or similar (not DB); store URL reference in DB
- Drive doc context: fetch doc content at query time (not cached), inject as truncated block
- For large collections: consider a "search my knowledge base" chat command that pulls items on demand rather than requiring manual toggle
- Could auto-detect content type from URL (YouTube, Reddit, Drive, generic link)
- Tags for organization (home, car, tech, health, etc.)

### Related prior discussion
- 2026-03-03: Initial exploration in chat — covered links/YouTube/Reddit focus, URL auto-fetch of OG metadata, per-item context toggle, coach.ts injection pattern
- See also: `/root/.claude/plans/vectorized-sleeping-volcano.md` for draft technical spec (covers text/link/youtube/reddit, no photos/Drive yet)
