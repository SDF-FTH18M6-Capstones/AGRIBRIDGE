/** Public reference caching and in-flight coalescing; private results are never cached. */
export function createResourceLoader(fetchResource, identity, now = Date.now) {
  const pending = new Map();
  const reference = new Map();
  const isPublicReference = path => ['/locations', '/categories/'].includes(path);
  function invalidate() { reference.clear(); pending.clear(); }
  async function load(path, { force = false } = {}) {
    const publicData = isPublicReference(path);
    const key = publicData ? path : `${identity()}::${path}`;
    const cached = reference.get(key);
    if (!force && cached && now() - cached.at < 30000) return cached.response;
    if (pending.has(key)) return pending.get(key);
    const request = Promise.resolve().then(() => fetchResource(path));
    pending.set(key, request);
    try {
      const response = await request;
      if (publicData && pending.get(key) === request) reference.set(key, { response, at: now() });
      return response;
    } finally { if (pending.get(key) === request) pending.delete(key); }
  }
  return { load, invalidate };
}
