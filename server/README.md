# FinancePro API

REST API para o sistema financeiro pessoal FinancePro.

## Stack
- **Node.js** + **Express** — servidor HTTP
- **PostgreSQL** — banco de dados relacional
- **pg** — driver PostgreSQL para Node.js

## Endpoints

### Transactions
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/transactions` | Lista todas as transações |
| POST | `/api/transactions` | Cria nova transação |
| PUT | `/api/transactions/:id` | Atualiza transação |
| DELETE | `/api/transactions/:id` | Remove transação |

### Recurring
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/recurring` | Lista recorrentes |
| POST | `/api/recurring` | Cria recorrente |
| PUT | `/api/recurring/:id` | Atualiza recorrente |
| DELETE | `/api/recurring/:id` | Remove recorrente e transações vinculadas |

### Health
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status da API |

## Como rodar localmente

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL

# Criar tabelas no banco
npm run db:migrate

# Iniciar servidor de desenvolvimento
npm run dev

# Iniciar em produção
npm start
```

## Variáveis de ambiente

```env
PORT=3001
DATABASE_URL=postgresql://usuario:senha@host:5432/financepro
FRONTEND_URL=http://localhost:5173
```
