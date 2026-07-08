# MIM Archive Reviver

Semantic search over the archived TechNet Wiki content for Microsoft FIM/MIM
(Forefront/Microsoft Identity Manager). Keyword search stopped surfacing it
years ago; this project brings it back.

## The problem

A colleague still supporting FIM/MIM flagged it plainly: the TechNet Wiki
content got archived, and along with the move, its search ranking dropped to
effectively zero. Years of real troubleshooting knowledge, still technically
online, practically invisible.

## The approach

- Scrape the public TechNet Wiki archive, filtered to articles whose title
  mentions FIM or MIM.
- Chunk and embed the content.
- Store vectors in LanceDB.
- Serve a small search API + minimal UI.
- Expose the same search as an MCP tool, so any AI agent can use it too.

## Status

Early build. See `/docs` for the running spec and the story of how this got
built, end to end, working alongside an AI agent (Scout).

## Running locally

1. `npm install`
2. `npm run ingest` — scrapes the public TechNet Wiki archive (FIM/MIM titles only)
3. Copy `.env.example` to `.env` and fill in your Azure OpenAI endpoint/key
4. `npm run index` — chunks + embeds the articles into a local LanceDB table
5. `npm start` — serves the search API + UI on http://localhost:3000
6. `npm run mcp` — runs the MCP server (stdio) exposing `search_fim_mim_archive`

The public demo caps searches at `DAILY_REQUEST_LIMIT` (default 50/day) to
keep Azure OpenAI cost bounded.

## Stack

Node.js, Express, [LanceDB](https://lancedb.com/), Model Context Protocol SDK,
OpenAI-compatible embeddings. Hosted on Azure Container Apps.

## License

MIT
