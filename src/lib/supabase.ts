import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!url || !key) {
  throw new Error('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY')
}

export const supabase = createClient(url, key)

/** Usernames are stored in Supabase Auth as <username>@mookata.local. */
export const LOGIN_DOMAIN = 'mookata.local'
export const toLoginEmail = (username: string) => {
  const u = username.trim().toLowerCase()
  return u.includes('@') ? u : `${u}@${LOGIN_DOMAIN}`
}
export const toUsername = (email?: string | null) => {
  if (!email) return ''
  return email.endsWith(`@${LOGIN_DOMAIN}`) ? email.slice(0, -LOGIN_DOMAIN.length - 1) : email
}

export type Category = { id: number; name: string; sort_order: number }

export type MenuItem = {
  id: number
  category_id: number
  name: string
  description: string
  price: number
  kind: 'set' | 'addon' | 'drink' | 'other'
  serves: number | null
  image_url: string | null
  is_available: boolean
  sort_order: number
}

export type OrderStatus = 'pending' | 'preparing' | 'serving' | 'served' | 'cancelled'

export type SessionView = {
  ok: boolean
  error?: string
  table_name: string
  status: 'open' | 'bill_requested' | 'closed'
  orders: {
    id: number
    status: OrderStatus
    created_at: string
    note: string
    items: { name: string; qty: number; unit_price: number }[]
  }[]
  total: number
  open_requests: string[]
}

export const baht = (n: number) =>
  Number(n) === 0 ? 'ฟรี' : `฿${Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`

export const errText = (e: unknown) => {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: string }).message)
  return 'เกิดข้อผิดพลาด ลองอีกครั้ง'
}
