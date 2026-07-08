// Fetches each URL from the curated FIM/MIM seed list (ingest/fim-mim-seeds.txt,
// 451 public archive.technet-wiki articles from a full alpha-index sweep) and
// saves cleaned text + source URL to data/raw/<slug>.json.
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { loadSeeds } = require("./load-seeds");

const OUT_DIR = path.join(__dirname, "..", "data", "raw");

function slugify(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 120);
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": "mim-archive-reviver/0.1 (personal project)" } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

function extractArticle(html) {
  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim() || $("title").text().trim();
  const main = $("main").first();
  main.find("script, style, nav, .feedback, .content-feedback").remove();
  const text = main.text().replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { title, text };
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const seeds = loadSeeds();
  console.log(`Loaded ${seeds.length} seed URLs from fim-mim-seeds.txt`);

  let saved = 0;
  let failed = 0;
  for (const { title: seedTitle, url } of seeds) {
    try {
      const html = await fetchPage(url);
      const { title, text } = extractArticle(html);
      const finalTitle = title || seedTitle;
      const slug = slugify(url);
      fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify({ url, title: finalTitle, text }, null, 2), "utf8");
      saved += 1;
      if (saved % 25 === 0) console.log(`[${saved}/${seeds.length}] ${finalTitle}`);
    } catch (err) {
      failed += 1;
      console.error(`[skip] ${url}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 200)); // be polite to the public archive
  }

  console.log(`Done. ${saved} articles saved, ${failed} failed, out of ${seeds.length} seeds.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
