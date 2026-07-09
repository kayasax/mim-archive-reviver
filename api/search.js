// Shared search logic: embed the query, cosine-similarity search over the
// LanceDB table built by ingest/chunk-and-embed.js. Falls back to a clear
// error if the index hasn't been built yet.
require("dotenv").config();
const path = require("path");
const lancedb = require("@lancedb/lancedb");
const { AzureOpenAI } = require("openai");
const { DefaultAzureCredential, getBearerTokenProvider } = require("@azure/identity");

const DB_DIR = path.join(__dirname, "..", "data", "lancedb");
const TABLE = "fim_mim_chunks";
const EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";

let _db = null;
async function db() {
  if (_db) return _db;
  _db = await lancedb.connect(DB_DIR);
  return _db;
}

let _client = null;
function client() {
  if (_client) return _client;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    throw new Error("Azure OpenAI is not configured (AZURE_OPENAI_ENDPOINT missing).");
  }
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  if (process.env.AZURE_OPENAI_API_KEY) {
    _client = new AzureOpenAI({ endpoint, apiKey: process.env.AZURE_OPENAI_API_KEY, apiVersion, deployment: EMBEDDING_DEPLOYMENT });
  } else {
    const credential = new DefaultAzureCredential();
    const azureADTokenProvider = getBearerTokenProvider(credential, "https://cognitiveservices.azure.com/.default");
    _client = new AzureOpenAI({ endpoint, azureADTokenProvider, apiVersion, deployment: EMBEDDING_DEPLOYMENT });
  }
  return _client;
}

async function embedQuery(text) {
  const res = await client().embeddings.create({ model: EMBEDDING_DEPLOYMENT, input: text });
  return res.data[0].embedding;
}

// Pure vector search treats an exact identifier like an error code ("25009")
// as just another token, with no special weight. On this corpus, that let a
// generic installation article outrank the one specifically about the exact
// error code asked about, because their surrounding wording was similar
// enough for the embedding distances to barely differ. Extract distinctive
// exact tokens from the query (mainly numeric codes, 4+ digits) and boost
// any candidate whose title or text contains them verbatim: a minimal
// keyword layer on top of semantic search (a small step toward hybrid
// search), not a full keyword engine.
function extractExactTokens(query) {
  const matches = query.match(/\b\d{4,}\b/g) || [];
  return [...new Set(matches)];
}

function applyExactMatchBoost(results, exactTokens) {
  if (exactTokens.length === 0) return results;
  return results.map((r) => {
    const haystack = `${r.title} ${r.text}`;
    const hasExactMatch = exactTokens.some((tok) => haystack.includes(tok));
    // Distances on this model cluster tightly (~0.95-1.1); a fixed nudge is
    // enough to move a genuine exact-code match ahead of a merely-similar
    // generic article, without overriding a much stronger semantic result.
    const adjustedDistance = hasExactMatch ? r._distance - 0.05 : r._distance;
    return { ...r, _adjustedDistance: adjustedDistance };
  });
}

/**
 * @param {string} query
 * @param {number} topK
 * @returns {Promise<Array<{title:string, url:string, text:string, score:number}>>}
 */
async function search(query, topK = 5) {
  const database = await db();
  const tableNames = await database.tableNames();
  if (!tableNames.includes(TABLE)) {
    throw new Error("Search index not built yet. Run the ingestion + indexing scripts first.");
  }
  const table = await database.openTable(TABLE);
  const vector = await embedQuery(query);
  // Over-fetch candidates so the exact-match boost has a real pool to
  // re-rank from, then trim back down to topK after boosting.
  const candidates = await table.search(vector).limit(Math.max(topK * 4, 20)).toArray();

  const exactTokens = extractExactTokens(query);
  const boosted = applyExactMatchBoost(candidates, exactTokens)
    .sort((a, b) => (a._adjustedDistance ?? a._distance) - (b._adjustedDistance ?? b._distance))
    .slice(0, topK);

  // Score reflects the same distance used for ranking (after the exact-match
  // boost), so the displayed percentage and the sort order always agree.
  // Absolute score, NOT relative to the top result of this query: a relative
  // score (top match = 100%) was tried and reverted, it made every top-1
  // result look like a perfect match even when the actual best distance was
  // mediocre, hiding weak result sets instead of surfacing them. Absolute
  // scores can look "flat" (often 40-60%) since distances for this model
  // cluster tightly, but they're honest about match quality.
  return boosted.map((r) => {
    const distanceForScore = r._adjustedDistance ?? r._distance;
    return {
      title: r.title,
      url: r.url,
      text: r.text,
      score: distanceForScore != null ? Math.round((1 / (1 + distanceForScore)) * 100) : null,
    };
  });
}

module.exports = { search };
