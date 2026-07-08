// Simple in-memory daily rate limiter, per IP, reset at UTC midnight.
// Good enough for a low-traffic public demo; keeps Azure OpenAI cost bounded.
const LIMIT = Number(process.env.DAILY_REQUEST_LIMIT || 50);

const counts = new Map(); // ip -> { day: 'YYYY-MM-DD', count: number }

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const day = todayUTC();
  const entry = counts.get(ip);

  if (!entry || entry.day !== day) {
    counts.set(ip, { day, count: 1 });
    return next();
  }

  if (entry.count >= LIMIT) {
    return res.status(429).json({
      error: `Demo rate limit reached (${LIMIT} searches/day). Please try again tomorrow (UTC).`,
    });
  }

  entry.count += 1;
  next();
}

module.exports = { rateLimit, LIMIT };
