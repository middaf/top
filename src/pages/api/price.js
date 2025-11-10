// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute
const RETRY_AFTER = 30 * 1000; // 30 seconds after rate limit

// If you want to disable external CoinGecko calls in development (e.g. offline or rate limit)
// set environment variable DISABLE_PRICE_API=true in your .env.local
const DISABLE_PRICE_API = process.env.DISABLE_PRICE_API === 'true';

function getCachedData(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCacheData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Generate fallback data for multiple coins
function generateFallbackData(ids, vs) {
  const coins = ids.split(',');
  const result = {};
  
  coins.forEach(coin => {
    const trimmedCoin = coin.trim();
    result[trimmedCoin] = {
      [vs]: trimmedCoin === 'bitcoin' ? 95000 : trimmedCoin === 'ethereum' ? 3500 : 1000
    };
  });
  
  return result;
}

export default async function handler(req, res) {
  const ids = req.query.ids || req.query.coin || 'bitcoin';
  const vs = req.query.vs || req.query.vs_currencies || 'usd';
  const cacheKey = `${ids}-${vs}`;

  console.log('Price API called with:', { ids, vs });

  // Set CORS and content headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59');

  // Check cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log('Returning cached data:', cachedData);
    return res.status(200).json(cachedData);
  }

  // Short-circuit external calls when explicitly disabled (useful in dev/offline)
  if (DISABLE_PRICE_API) {
    const fallbackData = generateFallbackData(ids, vs);
    console.log('Using fallback data (API disabled):', fallbackData);
    res.setHeader('X-Using-Fallback-Data', 'true');
    setCacheData(cacheKey, fallbackData);
    return res.status(200).json(fallbackData);
  }

  try {
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs)}`
    );

    if (!cgRes.ok) {
      const text = await cgRes.text();
      console.error('CoinGecko error:', cgRes.status, text);

      // Handle rate limiting specifically
      if (cgRes.status === 429) {
        // If we have stale data, return it
        if (cachedData) {
          res.setHeader('X-Using-Cached-Data', 'true');
          return res.status(200).json(cachedData);
        }
        // No cached data, return rate limit error with retry info
        return res.status(429).json({
          error: 'Rate limited by CoinGecko',
          retryAfter: RETRY_AFTER / 1000,
          message: 'Using development fallback values'
        });
      }

      // For other errors, return fallback development values
      const fallbackData = generateFallbackData(ids, vs);
      console.log('Using fallback data (CoinGecko error):', fallbackData);
      setCacheData(cacheKey, fallbackData);
      res.setHeader('X-Using-Fallback-Data', 'true');
      return res.status(200).json(fallbackData);
    }

    const data = await cgRes.json();
    console.log('CoinGecko API response:', data);
    setCacheData(cacheKey, data);
    return res.status(200).json(data);

  } catch (err) {
    console.error('Price proxy error:', err);
    
    // On network errors, return cached data if available
    if (cachedData) {
      res.setHeader('X-Using-Cached-Data', 'true');
      return res.status(200).json(cachedData);
    }

    // Otherwise return fallback values for development
    const fallbackData = generateFallbackData(ids, vs);
    console.log('Using fallback data (network error):', fallbackData);
    return res.status(200).json(fallbackData);
  }
}
