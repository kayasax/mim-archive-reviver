// Scrapes the public TechNet Wiki archive (learn.microsoft.com/.../archive/technet-wiki/*),
// starting from a small seed list and following internal links whose title
// mentions FIM or MIM, up to MAX_PAGES. Saves cleaned text + source URL to
// data/raw/<slug>.json. No internal/private data is touched; this only reads
// pages that are already public on learn.microsoft.com.
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const seeds = require("./seeds");

const OUT_DIR = path.join(__dirname, "..", "data", "raw");
const MAX_PAGES = Number(process.env.MAX_PAGES || 150);
const FIM_MIM_RE = /\b(fim|mim)\b/i;

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

function extractArticle(html, url) {
  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim() || $("title").text().trim();
  // Microsoft Learn archive pages render the article body in <main>.
  const main = $("main").first();
  main.find("script, style, nav, .feedback, .content-feedback").remove();
  const text = main.text().replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const links = [];
  main.find("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const linkText = $(el).text().trim();
    if (!href) return;
    let abs;
    try {
      abs = new URL(href, url).toString();
    } catch {
      return;
    }
    if (abs.includes("/archive/technet-wiki/")) {
      links.push({ url: abs.split("#")[0], text: linkText });
    }
  });

  return { title, text, links };
}

async function crawl() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const queue = [...seeds];
  const seen = new Set();
  let saved = 0;

  while (queue.length && saved < MAX_PAGES) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);

    let html;
    try {
      html = await fetchPage(url);
    } catch (err) {
      console.error(`[skip] ${url}: ${err.message}`);
      continue;
    }

    const { title, text, links } = extractArticle(html, url);

    if (FIM_MIM_RE.test(title)) {
      const slug = slugify(url);
      const outPath = path.join(OUT_DIR, `${slug}.json`);
      fs.writeFileSync(outPath, JSON.stringify({ url, title, text }, null, 2), "utf8");
      saved += 1;
      console.log(`[saved ${saved}] ${title}`);
    } else {
      console.log(`[skip title] ${title || url}`);
    }

    for (const link of links) {
      if (!seen.has(link.url) && (FIM_MIM_RE.test(link.text) || FIM_MIM_RE.test(link.url))) {
        queue.push(link.url);
      }
    }

    // Be polite to the public archive.
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Done. ${saved} FIM/MIM articles saved to ${OUT_DIR}`);
}

crawl().catch((err) => {
  console.error(err);
  process.exit(1);
});
