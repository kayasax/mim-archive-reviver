// Simple in-memory daily rate limiter, global (not per-IP), reset at UTC
// midnight. Good enough for a low-traffic public demo; keeps Azure OpenAI
// cost bounded regardless of how many distinct visitors show up in a day.
const LIMIT = Number(process.env.DAILY_REQUEST_LIMIT || 50);

let state = { day: todayUTC(), count: 0 };

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function resetIfNewDay() {
  const day = todayUTC();
  if (state.day !== day) {
    state = { day, count: 0 };
  }
}

function rateLimit(req, res, next) {
  resetIfNewDay();

  if (state.count >= LIMIT) {
    return res.status(429).json({
      error: `Demo rate limit reached (${LIMIT} searches/day, shared across all visitors). Please try again tomorrow (UTC).`,
    });
  }

  state.count += 1;
  next();
}

function getStats() {
  resetIfNewDay();
  return { day: state.day, count: state.count, limit: LIMIT, remaining: Math.max(0, LIMIT - state.count) };
}

module.exports = { rateLimit, getStats, LIMIT };
