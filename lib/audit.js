const cheerio = require('cheerio');

/**
 * Fetches a URL and extracts an audit report.
 * Throws a typed error object { status, message } on failure so the
 * caller (Express route) can map it to a sensible HTTP response.
 */
async function auditUrl(rawUrl, { fetchImpl = fetch, timeoutMs = 1 } = {}) {
  const url = normalizeUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const start = Date.now();
  let response;
  try {
    response = await fetchImpl(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'PagePulse/1.0 (+https://digitalheroesco.com)' },
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw { status: 504, message: `Request timed out after ${timeoutMs}ms` };
    }
    throw { status: 502, message: `Could not reach URL: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
  const responseTimeMs = Date.now() - start;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw {
      status: 422,
      message: `Expected an HTML page, got content-type "${contentType || 'unknown'}"`,
    };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() || null;
  const h1Count = $('h1').length;

  const images = $('img');
  let imagesMissingAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') imagesMissingAlt += 1;
  });

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(' ').length : 0;

  return {
    url,
    httpStatus: response.status,
    responseTimeMs,
    title,
    metaDescription,
    h1Count,
    imageCount: images.length,
    imagesMissingAlt,
    wordCount,
  };
}

function normalizeUrl(input) {
  if (!input || typeof input !== 'string') {
    throw { status: 400, message: 'A URL is required' };
  }
  let candidate = input.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw { status: 400, message: `"${input}" is not a valid URL` };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw { status: 400, message: 'Only http and https URLs are supported' };
  }
  return parsed.toString();
}

module.exports = { auditUrl, normalizeUrl };
