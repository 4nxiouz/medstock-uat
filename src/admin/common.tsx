import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'

export const REQUEST_LABEL: Record<string, string> = {
  change_pan: 'เปลี่ยนกระทะ',
  refill_soup: 'เติมน้ำซุป',
  ice: 'ขอน้ำแข็ง',
  call_staff: 'เรียกพนักงาน',
  bill: 'ขอเช็คบิล',
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'ใหม่',
  preparing: 'กำลังเตรียม',
  serving: 'กำลังไปส่ง',
  served: 'ส่งแล้ว',
  cancelled: 'ยกเลิก',
}

export const minutesSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))

export const fmtMin = (m: number) => (m < 60 ? `${m} นาที` : `${Math.floor(m / 60)} ชม. ${m % 60} นาที`)

export const money = (n: number) => `฿${Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`

export const todayBkk = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)

/** Re-run `cb` whenever any of the given tables change (debounced). */
export function useRealtime(tables: string[], cb: () => void, key: string) {
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    let t: number | undefined
    const fire = () => { window.clearTimeout(t); t = window.setTimeout(() => cbRef.current(), 250) }
    let ch = supabase.channel(`rt-${key}`)
    tables.forEach((table) => { ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, fire) })
    ch.subscribe()
    const poll = window.setInterval(fire, 30000)
    return () => { window.clearTimeout(t); window.clearInterval(poll); supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** Ticks every `ms` so elapsed-time labels stay fresh. */
export function useTick(ms = 30000) {
  const [, set] = useState(0)
  useEffect(() => { const i = window.setInterval(() => set((x) => x + 1), ms); return () => window.clearInterval(i) }, [ms])
}

export function QR({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: 'M' }).then(setSrc) }, [value, size])
  return src ? <img src={src} width={size} height={size} alt="QR code" className="a-qr" /> : <div style={{ width: size, height: size }} />
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="a-backdrop" onClick={onClose}>
      <section className="a-modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="a-modal-head"><h2>{title}</h2><button className="a-link" onClick={onClose}>ปิด</button></header>
        {children}
      </section>
    </div>
  )
}

/** Short beep for new kitchen orders (needs one user tap to unlock audio). */
export function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const play = (freq: number, at: number) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = freq; o.type = 'sine'
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at)
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.25)
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.3)
    }
    play(880, 0); play(1175, 0.18)
    setTimeout(() => ctx.close(), 1000)
  } catch { /* audio not available */ }
}
