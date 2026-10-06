import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, errText } from '../lib/supabase'
import { REQUEST_LABEL, beep, fmtMin, minutesSince, useRealtime, useTick } from './common'
import { Icon } from '../components/Icons'

type KOrder = {
  id: number; status: 'pending' | 'preparing' | 'serving'; created_at: string; note: string
  table_sessions: { dining_tables: { name: string } | null } | null
  order_items: { name: string; qty: number; note: string }[]
}
type KReq = { id: number; type: string; created_at: string; table_sessions: { dining_tables: { name: string } | null } | null }

const COLS: { key: KOrder['status']; title: string; next: string; nextLabel: string }[] = [
  { key: 'pending', title: 'ออเดอร์ใหม่', next: 'preparing', nextLabel: 'เริ่มเตรียม' },
  { key: 'preparing', title: 'กำลังเตรียม', next: 'serving', nextLabel: 'พร้อม ไปส่ง' },
  { key: 'serving', title: 'กำลังไปส่ง', next: 'served', nextLabel: 'ส่งแล้ว' },
]

const tableName = (x: { table_sessions: { dining_tables: { name: string } | null } | null }) => x.table_sessions?.dining_tables?.name ?? '-'

export default function Kitchen() {
  useTick(20000)
  const [orders, setOrders] = useState<KOrder[]>([])
  const [reqs, setReqs] = useState<KReq[]>([])
  const [sound, setSound] = useState(false)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const seen = useRef<Set<number> | null>(null)
  const soundRef = useRef(sound)
  soundRef.current = sound

  const load = useCallback(async () => {
    const [o, r] = await Promise.all([
      supabase.from('orders')
        .select('id,status,created_at,note,table_sessions(dining_tables(name)),order_items(name,qty,note)')
        .in('status', ['pending', 'preparing', 'serving']).order('created_at'),
      supabase.from('service_requests').select('id,type,created_at,table_sessions(dining_tables(name))')
        .eq('status', 'open').neq('type', 'bill').order('created_at'),
    ])
    if (o.data) {
      const list = o.data as unknown as KOrder[]
      const ids = new Set(list.map((x) => x.id))
      if (seen.current && soundRef.current && list.some((x) => x.status === 'pending' && !seen.current!.has(x.id))) beep()
      seen.current = ids
      setOrders(list)
    }
    if (r.data) {
      const list = r.data as unknown as KReq[]
      setReqs((prev) => {
        if (soundRef.current && list.some((x) => !prev.find((p) => p.id === x.id)) && prev.length >= 0 && seen.current) beep()
        return list
      })
    }
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime(['orders', 'order_items', 'service_requests'], load, 'kitchen')

  const advance = async (id: number, next: string) => {
    setErr('')
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: next as KOrder['status'] } : o)).filter((o) => o.status !== ('served' as string)))
    const { error } = await supabase.rpc('set_order_status', { p_order_id: id, p_status: next, p_reason: null })
    if (error) setErr(errText(error))
    load()
  }

  const cancel = async () => {
    if (cancelId == null) return
    const { error } = await supabase.rpc('set_order_status', { p_order_id: cancelId, p_status: 'cancelled', p_reason: reason || 'ยกเลิกโดยร้าน' })
    if (error) setErr(errText(error))
    setCancelId(null); setReason(''); load()
  }

  const doneReq = async (id: number) => {
    setReqs((r) => r.filter((x) => x.id !== id))
    await supabase.from('service_requests').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', id)
  }

  return (
    <div className="a-page wide">
      <div className="a-page-head">
        <h1 className="with-ico"><Icon name="flame" size={26} /> ครัว</h1>
        <button className={`a-btn sm ${sound ? 'primary' : 'ghost'}`} onClick={() => { setSound(!sound); if (!sound) beep() }}>
          {sound ? 'เสียงเตือน: เปิด' : 'เปิดเสียงเตือน'}
        </button>
      </div>
      {err && <p className="a-error">{err}</p>}

      {reqs.length > 0 && (
        <div className="a-reqbar">
          {reqs.map((r) => (
            <div key={r.id} className="a-reqpill">
              <strong>{tableName(r)}</strong> {REQUEST_LABEL[r.type]}
              <small>{fmtMin(minutesSince(r.created_at))}</small>
              <button className="a-btn sm" onClick={() => doneReq(r.id)}>เสร็จ</button>
            </div>
          ))}
        </div>
      )}

      <div className="a-kcols">
        {COLS.map((c) => {
          const list = orders.filter((o) => o.status === c.key)
          return (
            <section key={c.key} className="a-kcol">
              <h2>{c.title} <span className="a-count">{list.length}</span></h2>
              {list.length === 0 && <p className="a-muted small a-empty">ไม่มี</p>}
              {list.map((o) => {
                const m = minutesSince(o.created_at)
                return (
                  <article key={o.id} className={`a-kcard ${m >= 15 ? 'late' : m >= 10 ? 'slow' : ''}`}>
                    <header>
                      <strong className="a-ktable">{tableName(o)}</strong>
                      <span className="a-ktime">{fmtMin(m)}</span>
                    </header>
                    <ul>
                      {o.order_items.map((it, k) => (
                        <li key={k}><b>{it.qty}×</b> {it.name}{it.note && <em> ({it.note})</em>}</li>
                      ))}
                    </ul>
                    {o.note && <p className="a-knote">{o.note}</p>}
                    <div className="a-row">
                      <button className="a-btn ghost sm" onClick={() => setCancelId(o.id)}>ยกเลิก</button>
                      <button className="a-btn primary" onClick={() => advance(o.id, c.next)}>{c.nextLabel}</button>
                    </div>
                    {cancelId === o.id && (
                      <div className="a-cancel">
                        <input id={`reason-${o.id}`} placeholder="เหตุผล เช่น ของหมด / ลูกค้าเปลี่ยนใจ" value={reason} onChange={(e) => setReason(e.target.value)} />
                        <div className="a-row">
                          <button className="a-btn ghost sm" onClick={() => setCancelId(null)}>ไม่ยกเลิก</button>
                          <button className="a-btn danger sm" onClick={cancel}>ยืนยันยกเลิก</button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}
