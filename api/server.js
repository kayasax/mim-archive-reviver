require("dotenv").config();
const path = require("path");
const express = require("express");
const { search } = require("./search");
const { rateLimit, LIMIT } = require("./rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "..", "ui")));
app.use(express.json());

app.get("/api/search", rateLimit, async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) {
    return res.status(400).json({ error: "Missing query parameter ?q=" });
  }
  try {
    const results = await search(q, 5);
    res.json({ query: q, results, dailyLimit: LIMIT });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`MIM Archive Reviver API listening on :${PORT}`));
