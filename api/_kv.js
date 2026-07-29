const { Redis } = require('@upstash/redis');

let client = null;

function kv() {
  if (client) return client;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('No Redis storage connected. Add the Redis integration in your Vercel project settings.');
  }
  client = new Redis({ url, token });
  return client;
}

module.exports = { kv };
