const { neon } = require('@neondatabase/serverless');

const getDB = () => neon(process.env.DATABASE_URL);

async function init(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id        SERIAL PRIMARY KEY,
      date      TEXT NOT NULL,
      view_angle TEXT NOT NULL DEFAULT 'front',
      note      TEXT DEFAULT '',
      data_url  TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = getDB();
  await init(sql);

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, date, view_angle, note, data_url
      FROM photos ORDER BY created_at DESC
    `;
    return res.status(200).json(
      rows.map(r => ({ id: r.id, date: r.date, view: r.view_angle, note: r.note, dataUrl: r.data_url }))
    );
  }

  if (req.method === 'POST') {
    const { date, view, note, dataUrl } = req.body;
    if (!date || !dataUrl) return res.status(400).json({ error: 'date and dataUrl required' });
    const result = await sql`
      INSERT INTO photos (date, view_angle, note, data_url)
      VALUES (${date}, ${view || 'front'}, ${note || ''}, ${dataUrl})
      RETURNING id
    `;
    return res.status(200).json({ id: result[0].id });
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query?.id);
    if (!id) return res.status(400).json({ error: 'id required' });
    await sql`DELETE FROM photos WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
