// Loads the curated FIM/MIM TechNet Wiki archive seed list (fim-mim-seeds.txt):
// 451 public article URLs discovered via a full alpha-index sweep of
// learn.microsoft.com/en-us/archive/technet-wiki/. Format: "# title" line
// followed immediately by a URL line, entries separated by blank lines.
const fs = require("fs");
const path = require("path");

function loadSeeds() {
  const raw = fs.readFileSync(path.join(__dirname, "fim-mim-seeds.txt"), "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const seeds = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#") && !/^#\s*(TechNet|Source:|Letters|Articles|FIM\/MIM matches|Format:)/i.test(line)) {
      const title = line.replace(/^#\s*/, "");
      const next = lines[i + 1];
      if (next && next.startsWith("http")) {
        seeds.push({ title, url: next });
        i++;
      }
    }
  }
  return seeds;
}

module.exports = { loadSeeds };
