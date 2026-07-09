# MIM Archive Reviver

Semantic search over the archived TechNet Wiki content for Microsoft FIM/MIM
(Forefront/Microsoft Identity Manager). Keyword search stopped surfacing it
years ago; this project brings it back.

**Live demo:** https://mimar.yespapa.eu
(rate-limited to keep Azure costs sane, see below)

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

Live: 450 FIM/MIM TechNet Wiki archive articles scraped, chunked, embedded
(Azure OpenAI text-embedding-3-small), and indexed in LanceDB (~1,350 vector
chunks). Deployed to Azure Container Apps. See `/docs/blog-draft.md` for the
full story of how this got built, working alongside an AI agent (Scout).

## Running locally

1. `npm install`
2. `npm run ingest` — scrapes the public TechNet Wiki archive (FIM/MIM titles only)
3. Copy `.env.example` to `.env` and fill in your Azure OpenAI endpoint/key
4. `npm run index` — chunks + embeds the articles into a local LanceDB table
5. `npm start` — serves the search API + UI on http://localhost:3000
6. `npm run mcp` — runs the MCP server (stdio) exposing `search_fim_mim_archive`

The public demo caps searches at `DAILY_REQUEST_LIMIT` (default 50/day) to
keep Azure OpenAI cost bounded.

## Deploying

Two-image split (data changes rarely, code changes often):

```powershell
# Rebuild only when data/lancedb changes (slower)
az acr build --registry mimarchivereviveracr --image mim-archive-reviver-data:latest -f Dockerfile.data .

# Rebuild on every code change (fast, seconds)
az acr build --registry mimarchivereviveracr --image mim-archive-reviver:latest -f Dockerfile .
```

## Stack

Node.js, Express, [LanceDB](https://lancedb.com/), Model Context Protocol SDK,
OpenAI-compatible embeddings. Hosted on Azure Container Apps.

## License

MIT
