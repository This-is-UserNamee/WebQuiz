// apps/backend/index.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
