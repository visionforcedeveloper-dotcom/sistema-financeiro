const express = require('express')
const router = express.Router()
const pool = require('../db/pool')

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
    )
    res.json(result.rows)
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
        (description, amount, date, type, status, payment_date, recurring_id,
         installment_group_id, installment_number, installment_total,
         transfer_account_id, observation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [description, amount, date, type, status ?? 'pending',
       payment_date ?? null, recurring_id ?? null,
       installment_group_id ?? null, installment_number ?? null,
       installment_total ?? null, transfer_account_id ?? null,
       observation ?? null]
    )
    res.status(201).json(result.rows[0])
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
  const values = [...Object.values(fields), id]

  try {
    const result = await pool.query(
      `UPDATE transactions SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      values
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Não encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query('DELETE FROM transactions WHERE id = $1', [id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Não encontrado' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
