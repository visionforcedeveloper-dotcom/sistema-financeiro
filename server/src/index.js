const express = require('express')
const cors = require('cors')
require('dotenv').config()

const transactionsRouter = require('./routes/transactions')
const recurringRouter = require('./routes/recurring')
const authRouter = require('./routes/auth')

const app = express()
const PORT = process.env.PORT || 3001

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Permite localhost em qualquer porta e o domínio do Vercel
    if (!origin || origin.includes('localhost') || origin.includes('vercel.app')) {
      callback(null, true)
    } else {
      callback(new Error('Não permitido pelo CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/recurring', recurringRouter)

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada` })
})

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`🚀 FinancePro API rodando em http://localhost:${PORT}`)
})
