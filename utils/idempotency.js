class IdempotencyCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttl = 24 * 60 * 60 * 1000) {
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttl
    });
    this.cleanup();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new IdempotencyCache();