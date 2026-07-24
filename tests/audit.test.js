const { auditUrl } = require('../lib/audit');

function mockFetch({ status = 200, contentType = 'text/html', body = '<html></html>' } = {}) {
  return async () => ({
    status,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
  });
}

describe('auditUrl', () => {
  test('happy path: parses title, meta description, H1s, alt text, word count', async () => {
    const html = `
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="A sample page for testing">
        </head>
        <body>
          <h1>Heading One</h1>
          <h1>Heading Two</h1>
          <img src="a.jpg" alt="a photo">
          <img src="b.jpg">
          <p>Some words to count here in the body</p>
        </body>
      </html>`;

    const report = await auditUrl('example.com', {
      fetchImpl: mockFetch({ body: html }),
    });

    expect(report.title).toBe('Test Page');
    expect(report.metaDescription).toBe('A sample page for testing');
    expect(report.h1Count).toBe(2);
    expect(report.imageCount).toBe(2);
    expect(report.imagesMissingAlt).toBe(1);
    expect(report.wordCount).toBeGreaterThan(0);
    expect(report.httpStatus).toBe(200);
    expect(report.url).toBe('https://example.com/');
  });

  test('failure case: invalid URL is rejected before any fetch happens', async () => {
    await expect(auditUrl('not a url')).rejects.toMatchObject({ status: 400 });
  });

  test('failure case: non-HTML response is rejected with 422', async () => {
    await expect(
      auditUrl('example.com/data.json', {
        fetchImpl: mockFetch({ contentType: 'application/json', body: '{}' }),
      })
    ).rejects.toMatchObject({ status: 422 });
  });

  test('failure case: request timeout is rejected with 504', async () => {
    const abortingFetch = async (url, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });

    await expect(
      auditUrl('example.com', { fetchImpl: abortingFetch, timeoutMs: 10 })
    ).rejects.toMatchObject({ status: 504 });
  });
});
