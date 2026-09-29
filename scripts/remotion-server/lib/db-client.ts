import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString && typeof window === 'undefined') {
  console.warn("DATABASE_URL is not set. Database operations might fail.")
}

let pool: Pool

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('supabase') || connectionString?.includes('render') || connectionString?.includes('neon') ? { rejectUnauthorized: false } : undefined
  })
} else {
  const globalWithPool = global as typeof globalThis & {
    _postgresPool?: Pool
  }
  if (!globalWithPool._postgresPool) {
    globalWithPool._postgresPool = new Pool({
      connectionString,
      ssl: connectionString?.includes('supabase') || connectionString?.includes('render') || connectionString?.includes('neon') ? { rejectUnauthorized: false } : undefined
    })
  }
  pool = globalWithPool._postgresPool
}

export { pool }

export async function query(text: string, params?: any[]) {
  return pool.query(text, params)
}
