const { Redis } = require('@upstash/redis');

let client = null;

// Vercel's Upstash integration names its env vars differently depending on the
// prefix chosen at install time (KV_REST_API_URL, UPSTASH_REDIS_REST_URL,
// STORAGE_REST_API_URL, ...). Rather than hardcode one, find whichever pair is
// present so the integration keeps working whatever prefix was used.
function findCredentials() {
  const env = process.env;

  const urlKey = Object.keys(env).find(
    (k) => /REST_API_URL$|REDIS_REST_URL$/.test(k) && env[k]
  );
  if (urlKey) {
    const tokenKey = Object.keys(env).find(
      (k) => /REST_API_TOKEN$|REDIS_REST_TOKEN$/.test(k) && env[k]
    );
    if (tokenKey) return { url: env[urlKey], token: env[tokenKey] };
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

module.exports = { kv, findCredentials };
