// Cliente HTTP para a API Node.js + PostgreSQL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Erro ${res.status}`)
  }
  return res.json()
}

// ── Transactions ─────────────────────────────────────
export const api = {
  transactions: {
    list: () => request<any[]>('/api/transactions'),
    create: (data: Record<string, any>) =>
      request<any>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) =>
      request<any>(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<any>(`/api/transactions/${id}`, { method: 'DELETE' }),
  },
  recurring: {
    list: () => request<any[]>('/api/recurring'),
    create: (data: Record<string, any>) =>
      request<any>('/api/recurring', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, any>) =>
      request<any>(`/api/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<any>(`/api/recurring/${id}`, { method: 'DELETE' }),
  },
}
