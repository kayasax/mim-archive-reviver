// Chunks the scraped articles and embeds them into a local LanceDB table,
// using Azure OpenAI text-embedding-3-small (same model Loic used before).
// Auth: Entra ID (DefaultAzureCredential, e.g. `az login`) by default, since
// this resource has local API-key auth disabled. Set AZURE_OPENAI_API_KEY to
// use key auth instead if you ever enable it.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const lancedb = require("@lancedb/lancedb");
const { AzureOpenAI } = require("openai");
const { DefaultAzureCredential, getBearerTokenProvider } = require("@azure/identity");

const RAW_DIR = path.join(__dirname, "..", "data", "raw");
const DB_DIR = path.join(__dirname, "..", "data", "lancedb");
const TABLE = "fim_mim_chunks";
const CHUNK_SIZE = 1200; // characters, ~ a few hundred tokens
const CHUNK_OVERLAP = 200;

const EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";

function chunkText(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

let _client = null;
function client() {
  if (_client) return _client;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    throw new Error("Missing AZURE_OPENAI_ENDPOINT. Set it in a local .env file (gitignored) before running the indexer.");
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

async function embed(text) {
  const res = await client().embeddings.create({ model: EMBEDDING_DEPLOYMENT, input: text });
  return res.data[0].embedding;
}

async function run() {
  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`No raw articles found in ${RAW_DIR}. Run "npm run ingest" first.`);
    process.exit(1);
  }

  const rows = [];
  for (const file of files) {
    const { url, title, text } = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf8"));
    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Embedding ${title} [chunk ${i + 1}/${chunks.length}]`);
      const vector = await embed(chunks[i]);
      rows.push({ url, title, chunk_index: i, text: chunks[i], vector });
    }
  }

  const db = await lancedb.connect(DB_DIR);
  const existing = await db.tableNames();
  if (existing.includes(TABLE)) {
    await db.dropTable(TABLE);
  }
  await db.createTable(TABLE, rows);
  console.log(`Indexed ${rows.length} chunks from ${files.length} articles into ${DB_DIR}/${TABLE}`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
