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
  const results = await table.search(vector).limit(topK).toArray();

  // Raw cosine distances for this embedding model cluster tightly (roughly
  // 0.8-1.3), so an absolute 1/(1+distance) score barely moves and looks
  // misleadingly low even for great matches. Normalize relative to this
  // query's own best/worst result instead: top match = 100%, scaled down
  // from there. This reflects ranking confidence within the result set,
  // not a universal similarity percentage.
  const distances = results.map((r) => r._distance).filter((d) => d != null);
  const minDist = distances.length ? Math.min(...distances) : 0;
  const maxDist = distances.length ? Math.max(...distances) : 0;
  const spread = maxDist - minDist;

  return results.map((r) => {
    let score = null;
    if (r._distance != null) {
      if (spread < 1e-6) {
        score = 100; // all results equally close, e.g. topK=1
      } else {
        score = Math.round(100 - ((r._distance - minDist) / spread) * 60);
      }
    }
    return { title: r.title, url: r.url, text: r.text, score };
  });
}

module.exports = { search };
