const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const auth = require('../middleware/auth')

router.use(auth)

// GET /api/recurring
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recurring_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/recurring
router.post('/', async (req, res) => {
  const { description, amount, type, period, due_day, start_date, end_date } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO recurring_transactions
        (user_id, description, amount, type, period, due_day, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [req.userId, description, amount, type, period ?? 'monthly',
       due_day ?? 1, start_date, end_date ?? null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/recurring/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const fields = req.body
  const keys = Object.keys(fields)
  if (keys.length === 0) return res.status(400).json({ error: 'Nenhum campo enviado' })

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  const values = [...Object.values(fields), id, req.userId]

  try {
    const result = await pool.query(
      `UPDATE recurring_transactions SET ${setClause}
       WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2}
       RETURNING *`,
      values
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Não encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/recurring/:id — remove recorrente e suas transações
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    await pool.query(
      'DELETE FROM transactions WHERE recurring_id = $1 AND user_id = $2',
      [id, req.userId]
    )
    const result = await pool.query(
      'DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Não encontrado' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
