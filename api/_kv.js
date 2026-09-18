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

/**
 * One Upstash REST command. Values are stored as JSON, which is what the
 * @upstash/redis client this replaced wrote, so existing documents read back
 * unchanged.
 */
async function cmd(args) {
  const creds = findCredentials();
  if (!creds) {
    throw new Error(
      'No Redis connection found. Add the Upstash for Redis integration in your Vercel project (Storage tab), then redeploy.'
    );
  }
  const res = await fetch(creds.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

const kv = () => ({
  async get(key) {
    const raw = await cmd(['GET', key]);
    return raw == null ? null : JSON.parse(raw);
  },
  set: (key, value) => cmd(['SET', key, JSON.stringify(value)]),
});

module.exports = { kv };
