#!/usr/bin/env node
'use strict';

/**
 * scrape-technet.js — Fetch TechNet Wiki archive articles from the curated
 * FIM/MIM seed list (fim-mim-seeds.txt, 450 URLs) and save cleaned text +
 * source URL to data/raw/<slug>.json, ready for chunk-and-embed.js.
 *
 * Fetch/extraction logic ported as-is from Locus's own
 * ingest/index_archive_technet.js (kayasax/GreyMatter, commit e7e8f94):
 * native https with redirect handling, slice to <main>, cut chrome before
 * the <h1> and after "Additional resources", promote h2/h3/li to markdown
 * before stripping tags. Storage differs (flat JSON files here vs LanceDB
 * store() there), everything else is the same proven approach.
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const OUT_DIR = path.join(__dirname, '..', 'data', 'raw');
const SEED_FILE = path.join(__dirname, 'fim-mim-seeds.txt');
const UA = 'mim-archive-reviver/0.1 (personal project)';
const RATE_LIMIT_MS = 500;

// ---------------------------------------------------------------------------
// Seed list parser (same format/logic as Locus's loadSeedList)
// ---------------------------------------------------------------------------

function loadSeedList(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const out = [];
  const lines = txt.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.startsWith('http')) continue;
    let title = '';
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j].trim();
      if (!prev) continue;
      if (prev.startsWith('# ') && !/^# (Source|Letters|Articles|FIM\/MIM matches|Format|TechNet)/.test(prev)) {
        title = prev.slice(2).trim();
      }
      break;
    }
    out.push({ url: line, title });
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTTP fetch (https stdlib, follow up to 3 redirects, 30s timeout)
// ---------------------------------------------------------------------------

function fetchUrl(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        timeout: 30_000,
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && redirects > 0 && res.headers.location) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          return fetchUrl(next, redirects - 1).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`timeout for ${url}`));
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Extractor — strip Learn chrome, keep article body (ported from Locus)
// ---------------------------------------------------------------------------

const CHROME_PATTERNS = [
  /Table of contents/g,
  /Exit editor mode/g,
  /Ask Learn/g,
  /Reading mode/g,
  /Read in English/g,
  /Add to plan/g,
  /Copy Markdown/g,
  /Print/g,
  /Access to this page requires authorization\..*?changing directories\s*\./gs,
  /Summarize this article for me/g,
  /Submit and view feedback for/g,
  /This page/g,
  /View all page feedback/g,
  /Additional resources/g,
];

function extractTitleAndBody(html) {
  const mainStart = html.indexOf('<main');
  const mainEnd = html.lastIndexOf('</main>');
  if (mainStart < 0 || mainEnd < 0 || mainEnd <= mainStart) {
    return { title: '', body: '' };
  }
  let main = html.slice(mainStart, mainEnd);

  const h1Match = main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? stripTags(h1Match[1]).replace(/\s+/g, ' ').trim() : '';
  if (h1Match) {
    main = main.slice(h1Match.index + h1Match[0].length);
  }

  const tailIdx = main.search(/<h2[^>]*>\s*Additional resources\s*</i);
  if (tailIdx > 0) main = main.slice(0, tailIdx);

  main = main
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  main = main
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n');

  let text = stripTags(main);
  text = decodeEntities(text);

  for (const re of CHROME_PATTERNS) text = text.replace(re, ' ');

  text = text
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title, body: text };
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ');
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function slugify(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .slice(0, 120);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const seeds = loadSeedList(SEED_FILE);
  console.log(`Loaded ${seeds.length} URLs from seed list.\n`);

  let ok = 0,
    skipped = 0,
    errors = 0;

  for (let i = 0; i < seeds.length; i++) {
    const { url, title: seedTitle } = seeds[i];

    let html;
    try {
      html = await fetchUrl(url);
    } catch (err) {
      console.log(`[${i + 1}/${seeds.length}] FETCH ERROR ${url}: ${err.message}`);
      errors++;
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const { title, body } = extractTitleAndBody(html);
    const finalTitle = title || seedTitle;
    if (!body || body.length < 200) {
      console.log(`[${i + 1}/${seeds.length}] THIN (${body.length} chars): ${finalTitle}`);
      skipped++;
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const slug = slugify(url);
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify({ url, title: finalTitle, text: body }, null, 2), 'utf8');
    ok++;
    if (ok % 25 === 0) console.log(`[${i + 1}/${seeds.length}] OK (${ok} saved so far)`);

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Saved:   ${ok}`);
  console.log(`Skipped: ${skipped} (too thin)`);
  console.log(`Errors:  ${errors}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
