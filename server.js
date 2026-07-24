const express = require('express');
const path = require('path');
const { auditUrl } = require('./lib/audit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/audit', async (req, res) => {
  const { url } = req.query;
  try {
    const report = await auditUrl(url);
    res.json(report);
  } catch (err) {
    // Never crash on a bad page - always return a clean, typed error.
    const status = err.status || 500;
    const message = err.message || 'Unexpected error while auditing URL';
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Page Pulse listening on http://localhost:${PORT}`);
});

module.exports = app;
