const express = require('express')
const router = express.Router()
const pool = require('../db/pool')
const auth = require('../middleware/auth')

// Todas as rotas exigem autenticação
router.use(auth)

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [req.userId]
    )
    // PostgreSQL retorna NUMERIC como string — converte para número
    const rows = result.rows.map(r => ({ ...r, amount: parseFloat(r.amount) }))
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/transactions
router.post('/', async (req, res) => {
  const {
    description, amount, date, type, status,
    payment_date, recurring_id, installment_group_id,
    installment_number, installment_total,
    transfer_account_id, observation,
  } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO transactions
        (user_id, description, amount, date, type, status, payment_date, recurring_id,
         installment_group_id, installment_number, installment_total,
         transfer_account_id, observation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [req.userId, description, amount, date, type, status ?? 'pending',
       payment_date ?? null, recurring_id ?? null,
       installment_group_id ?? null, installment_number ?? null,
       installment_total ?? null, transfer_account_id ?? null,
       observation ?? null]
    )
    res.status(201).json({ ...result.rows[0], amount: parseFloat(result.rows[0].amount) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const fields = req.body
  const keys = Object.keys(fields)
  if (keys.length === 0) return res.status(400).json({ error: 'Nenhum campo enviado' })

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  const values = [...Object.values(fields), id, req.userId]

  try {
    const result = await pool.query(
      `UPDATE transactions SET ${setClause}
       WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2}
       RETURNING *`,
      values
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Não encontrado' })
    res.json({ ...result.rows[0], amount: parseFloat(result.rows[0].amount) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Não encontrado' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
