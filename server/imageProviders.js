const { db } = require('./db');
const { decryptCredential } = require('./aiCredentialCrypto');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_PROVIDERS = Object.freeze({
  pexels: {
    id: 'pexels',
    name: 'Pexels',
    description: 'Search the Pexels photo library for images for your book.',
    keyUrl: 'https://www.pexels.com/api/documentation/',
    licenseUrl: 'https://www.pexels.com/license/'
  },
  pixabay: {
    id: 'pixabay',
    name: 'Pixabay',
    description: 'Search Pixabay photos and illustrations for your book.',
    keyUrl: 'https://pixabay.com/api/docs/',
    licenseUrl: 'https://pixabay.com/service/license-summary/'
  }
});

const IMAGE_HOSTS = Object.freeze({
  pexels: new Set(['images.pexels.com']),
  pixabay: new Set(['cdn.pixabay.com', 'pixabay.com'])
});

function getStoredImageProviderRows(userId) {
  return db.prepare(
    'SELECT provider, encrypted_api_key, last_error, updated_at FROM image_provider_settings WHERE user_id = ?'
  ).all(userId);
}

function getImageProviderKeys(userId) {
  const keys = { pexels: '', pixabay: '' };
  for (const row of getStoredImageProviderRows(userId)) {
    if (!Object.prototype.hasOwnProperty.call(keys, row.provider)) continue;
    keys[row.provider] = decryptCredential(row.encrypted_api_key);
  }
  return keys;
}

function formatImageProviderSettings(userId) {
  const rows = new Map(getStoredImageProviderRows(userId).map((row) => [row.provider, row]));
  return Object.values(IMAGE_PROVIDERS).map((provider) => {
    const row = rows.get(provider.id);
    let keyLastFour = '';
    if (row) {
      try {
        keyLastFour = decryptCredential(row.encrypted_api_key).slice(-4);
      } catch {
        // Do not disclose or echo malformed ciphertext; report it as configured so the
        // account owner can replace or remove the unreadable value.
        keyLastFour = '----';
      }
    }
    return {
      id: provider.id,
      name: provider.name,
      description: provider.description,
      keyUrl: provider.keyUrl,
      licenseUrl: provider.licenseUrl,
      configured: Boolean(row),
      keyLastFour,
      lastError: row?.last_error || '',
      updatedAt: row?.updated_at || null
    };
  });
}

function providerError(providerId, status) {
  const provider = IMAGE_PROVIDERS[providerId];
  if (status === 401 || status === 403) {
    return `${provider.name} rejected this API key. Check that it is copied correctly and active.`;
  }
  if (status === 429) {
    return `${provider.name} rate limit reached. Wait a little and try again.`;
  }
  return `${provider.name} request failed (HTTP ${status}).`;
}

async function fetchProviderJson(providerId, url, init = {}) {
  const provider = IMAGE_PROVIDERS[providerId];
  let response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(12000)
    });
  } catch {
    throw new Error(`Could not reach ${provider.name} from this server. Check server network access and try again.`);
  }

  if (!response.ok) throw new Error(providerError(providerId, response.status));
  try {
    return await response.json();
  } catch {
    throw new Error(`${provider.name} returned an unreadable response.`);
  }
}

function makePixabayUrl(apiKey, query, count = 12) {
  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('orientation', 'horizontal');
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('per_page', String(count));
  return url;
}

async function verifyImageProviderKey(providerId, apiKey) {
  if (!IMAGE_PROVIDERS[providerId]) throw new Error('Unsupported image provider.');
  const cleanKey = String(apiKey || '').trim();
  if (cleanKey.length < 12) throw new Error('Enter a complete API key before testing this provider.');

  if (providerId === 'pexels') {
    await fetchProviderJson(providerId, 'https://api.pexels.com/v1/curated?per_page=1', {
      headers: { Authorization: cleanKey, Accept: 'application/json' }
    });
  } else {
    await fetchProviderJson(providerId, makePixabayUrl(cleanKey, 'book cover', 3).toString(), {
      headers: { Accept: 'application/json' }
    });
  }

  return { success: true, message: `${IMAGE_PROVIDERS[providerId].name} API key accepted.` };
}

async function searchPexels(apiKey, query, count) {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(count));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('size', 'large');
  const data = await fetchProviderJson('pexels', url.toString(), {
    headers: { Authorization: apiKey, Accept: 'application/json' }
  });

  return (Array.isArray(data.photos) ? data.photos : []).map((photo) => {
    const imageUrl = photo.src?.original || photo.src?.large2x || photo.src?.large || '';
    const fallbackImageUrl = [photo.src?.large2x, photo.src?.large, photo.src?.medium]
      .find((candidate) => candidate && candidate !== imageUrl) || '';
    return {
      id: `pexels-${photo.id}`,
      provider: 'pexels',
      providerName: 'Pexels',
      previewUrl: photo.src?.medium || photo.src?.large || imageUrl,
      imageUrl,
      fallbackImageUrl,
      sourceUrl: photo.url || '',
      licenseUrl: IMAGE_PROVIDERS.pexels.licenseUrl,
      creatorAttribution: photo.photographer ? `${photo.photographer} (Pexels)` : 'Pexels contributor',
      altText: String(photo.alt || '').slice(0, 500),
      width: Number(photo.width) || 0,
      height: Number(photo.height) || 0
    };
  }).filter((photo) => photo.previewUrl && photo.imageUrl && photo.sourceUrl);
}

async function searchPixabay(apiKey, query, count) {
  const url = makePixabayUrl(apiKey, query, count);
  url.searchParams.set('min_width', '1920');
  url.searchParams.set('min_height', '1080');
  const data = await fetchProviderJson('pixabay', url.toString(), {
    headers: { Accept: 'application/json' }
  });

  return (Array.isArray(data.hits) ? data.hits : []).map((hit) => {
    const imageUrl = hit.fullHDURL || hit.imageURL || hit.largeImageURL || hit.webformatURL || hit.previewURL || '';
    const fallbackImageUrl = [hit.largeImageURL, hit.webformatURL, hit.previewURL]
      .find((candidate) => candidate && candidate !== imageUrl) || '';
    return {
      id: `pixabay-${hit.id}`,
      provider: 'pixabay',
      providerName: 'Pixabay',
      previewUrl: hit.previewURL || hit.webformatURL || imageUrl,
      imageUrl,
      fallbackImageUrl,
      sourceUrl: hit.pageURL || '',
      licenseUrl: IMAGE_PROVIDERS.pixabay.licenseUrl,
      creatorAttribution: hit.user ? `${hit.user} (Pixabay)` : 'Pixabay contributor',
      altText: String(hit.tags || '').split(',').map((word) => word.trim()).filter(Boolean).slice(0, 8).join(', ').slice(0, 500),
      width: Number(hit.imageWidth) || 0,
      height: Number(hit.imageHeight) || 0
    };
  }).filter((photo) => photo.previewUrl && photo.imageUrl && photo.sourceUrl);
}

async function searchStockImages({ query, keys, provider = 'all', count = 12 }) {
  const cleanQuery = String(query || '').trim().slice(0, 160);
  if (cleanQuery.length < 2) throw new Error('Enter at least two characters to search stock images.');
  if (provider !== 'all' && !IMAGE_PROVIDERS[provider]) throw new Error('Choose Pexels, Pixabay, or all providers.');

  const requestedProviders = provider === 'all' ? ['pexels', 'pixabay'] : [provider];
  const perProviderCount = Math.max(3, Math.min(Number(count) || 12, 24));
  const providerStatus = {};
  const tasks = [];

  for (const providerId of requestedProviders) {
    const apiKey = String(keys?.[providerId] || '').trim();
    if (!apiKey) {
      providerStatus[providerId] = { status: 'not_configured', message: `${IMAGE_PROVIDERS[providerId].name} is not configured.` };
      continue;
    }
    tasks.push((async () => {
      try {
        const images = providerId === 'pexels'
          ? await searchPexels(apiKey, cleanQuery, perProviderCount)
          : await searchPixabay(apiKey, cleanQuery, perProviderCount);
        providerStatus[providerId] = {
          status: 'ok',
          resultCount: images.length,
          message: images.length ? '' : `No ${IMAGE_PROVIDERS[providerId].name} matches for this search.`
        };
        return images;
      } catch (error) {
        providerStatus[providerId] = { status: 'error', message: error.message || `${IMAGE_PROVIDERS[providerId].name} search failed.` };
        return [];
      }
    })());
  }

  const imageGroups = await Promise.all(tasks);
  const images = imageGroups.flat().slice(0, perProviderCount * requestedProviders.length);
  const configuredProviderCount = requestedProviders.filter((id) => keys?.[id]).length;
  let message = '';
  if (!configuredProviderCount) {
    message = 'Add a Pexels or Pixabay API key in the header’s API keys settings to search stock images.';
  } else if (!images.length) {
    message = requestedProviders.map((id) => providerStatus[id]?.message).filter(Boolean).join(' ')
      || 'No stock images were found. Try another search.';
  } else {
    const failed = requestedProviders.filter((id) => providerStatus[id]?.status === 'error');
    if (failed.length) {
      message = `Some providers could not be reached: ${failed.map((id) => providerStatus[id].message).join(' ')}`;
    }
  }

  return { query: cleanQuery, images, providers: providerStatus, message };
}

function validateProviderImageUrl(providerId, value) {
  if (!IMAGE_PROVIDERS[providerId]) throw new Error('Unsupported stock-image provider.');
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    throw new Error('The provider returned an invalid image address.');
  }
  const hostname = url.hostname.toLowerCase();
  const trustedPath = providerId === 'pexels'
    ? url.pathname.startsWith('/photos/')
    : hostname === 'pixabay.com'
      ? url.pathname.startsWith('/get/')
      : url.pathname.startsWith('/photo/') || url.pathname.startsWith('/get/');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    !IMAGE_HOSTS[providerId].has(hostname) ||
    !trustedPath
  ) {
    throw new Error('The stock-image address is outside the provider’s trusted image CDN.');
  }
  return url;
}

async function readLimitedImageBody(response, maxBytes) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) {
    throw new Error('This image is larger than the 8 MB book-asset limit. Choose another result.');
  }

  if (!response.body?.getReader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) throw new Error('This image is larger than the 8 MB book-asset limit. Choose another result.');
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('This image is larger than the 8 MB book-asset limit. Choose another result.');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock?.();
  }
  return Buffer.concat(chunks, totalBytes);
}

async function fetchStockImage(providerId, imageUrl) {
  let url = validateProviderImageUrl(providerId, imageUrl);
  let response;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    try {
      response = await fetch(url.toString(), {
        redirect: 'manual',
        headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8' },
        signal: AbortSignal.timeout(20000)
      });
    } catch {
      throw new Error(`Could not download this image from ${IMAGE_PROVIDERS[providerId].name}. Check server network access and try another result.`);
    }

    if (response.status >= 300 && response.status < 400) {
      if (redirectCount === 3) throw new Error('The stock-image CDN redirected too many times.');
      const location = response.headers.get('location');
      if (!location) throw new Error('The stock-image CDN returned an invalid redirect.');
      url = validateProviderImageUrl(providerId, new URL(location, url).toString());
      continue;
    }
    break;
  }

  if (!response?.ok) throw new Error(`The ${IMAGE_PROVIDERS[providerId].name} image could not be downloaded (HTTP ${response?.status || 'unknown'}).`);
  const mimeType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!mimeType.startsWith('image/') || mimeType === 'image/svg+xml') {
    throw new Error('The provider did not return a supported raster image.');
  }
  const buffer = await readLimitedImageBody(response, MAX_IMAGE_BYTES);
  if (!buffer.length) throw new Error('The provider returned an empty image. Choose another result.');
  return { buffer, mimeType };
}

module.exports = {
  IMAGE_PROVIDERS,
  MAX_IMAGE_BYTES,
  formatImageProviderSettings,
  getImageProviderKeys,
  verifyImageProviderKey,
  searchStockImages,
  validateProviderImageUrl,
  fetchStockImage
};
