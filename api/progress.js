const { neon } = require('@neondatabase/serverless');

const getDB = () => neon(process.env.DATABASE_URL);

async function init(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS progress (
      date TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = getDB();
  await init(sql);

  if (req.method === 'GET') {
    const rows = await sql`SELECT date, data FROM progress ORDER BY date DESC`;
    const result = {};
    rows.forEach(r => { result[r.date] = r.data; });
    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { date, data } = req.body;
    if (!date || !data) return res.status(400).json({ error: 'date and data required' });
    await sql`
      INSERT INTO progress (date, data)
      VALUES (${date}, ${JSON.stringify(data)})
      ON CONFLICT (date) DO UPDATE
        SET data = EXCLUDED.data, updated_at = NOW()
    `;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
