const form = document.getElementById('auditForm');
const input = document.getElementById('urlInput');
const statusEl = document.getElementById('status');
const reportEl = document.getElementById('report');

const FIELD_LABELS = {
  url: 'URL',
  httpStatus: 'HTTP status',
  responseTimeMs: 'Response time (ms)',
  title: 'Title',
  metaDescription: 'Meta description',
  h1Count: 'H1 count',
  imageCount: 'Images',
  imagesMissingAlt: 'Images missing alt text',
  wordCount: 'Word count (approx.)',
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  statusEl.textContent = '';
  reportEl.classList.add('hidden');
  reportEl.innerHTML = '';
  setLoading(true);

  try {
    const res = await fetch(`/api/audit?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || 'Something went wrong.';
      return;
    }

    renderReport(data);
  } catch (err) {
    statusEl.textContent = 'Network error — please try again.';
  } finally {
    setLoading(false);
  }
});

function renderReport(data) {
  reportEl.innerHTML = Object.entries(FIELD_LABELS)
    .map(([key, label]) => {
      const value = data[key] ?? '—';
      return `<div class="row"><span>${label}</span><span>${escapeHtml(String(value))}</span></div>`;
    })
    .join('');
  reportEl.classList.remove('hidden');
}

function setLoading(isLoading) {
  form.querySelector('button').disabled = isLoading;
  form.querySelector('button').textContent = isLoading ? 'Auditing…' : 'Audit';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
