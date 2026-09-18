const { Redis } = require('@upstash/redis');

let client = null;

// Vercel's Upstash integration names its env vars differently depending on the
// prefix chosen at install time (KV_REST_API_URL, UPSTASH_REDIS_REST_URL,
// STORAGE_REST_API_URL, ...). Rather than hardcode one, find whichever pair is
// present so the integration keeps working whatever prefix was used.
function findCredentials() {
  const env = process.env;

  // Take the token from the same prefix as the URL. Searching for the two
  // independently can marry a new database's URL to a dead one's token when a
  // replaced integration has left its variables behind, which fails as a
  // password error and sends you looking in the wrong place entirely.
  for (const key of Object.keys(env)) {
    const m = /^(.*)(REST_API_URL|REDIS_REST_URL)$/.exec(key);
    if (!m || !env[key]) continue;
    const token = env[m[1] + m[2].replace('URL', 'TOKEN')];
    if (token) return { url: env[key], token };
  }

  return null;
}

function kv() {
  if (client) return client;
  const creds = findCredentials();
  if (!creds) {
    throw new Error(
      'No Redis connection found. Add the Upstash for Redis integration in your Vercel project (Storage tab), then redeploy.'
    );
  }
  client = new Redis(creds);
  return client;
}

// Node's fetch says only "fetch failed" when a host does not resolve or refuses
// the connection — the error that actually matters is two levels down in .cause.
// A deleted or paused Upstash database looks exactly like this, and wrong
// credentials do not: those come back as WRONGPASS from a server that answered.
// Every write path shows this text to the user, so it has to name the fix.
function explain(err) {
  const chain = [];
  for (let e = err; e; e = e.cause) chain.push(e.code || '', e.message || '');
  const text = chain.join(' ');

  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|fetch failed/i.test(text)) {
    return 'Could not reach the database. Open your Vercel project, go to Storage, and check the Upstash for Redis database still exists — free databases are deleted after a long idle period. Reconnect it and redeploy.';
  }
  if (/WRONGPASS|NOPERM|unauthorized|401/i.test(text)) {
    return 'The database rejected the password. Reconnect the Upstash integration in your Vercel project so the keys are written again, then redeploy.';
  }
  if (/max request size|1 ?MB|request too large|413/i.test(text)) {
    return 'That was too large for the free database plan. Use a smaller image.';
  }
  return err.message || 'The database returned an error.';
}

module.exports = { kv, findCredentials, explain };
