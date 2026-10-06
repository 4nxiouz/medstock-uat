import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, errText } from '../lib/supabase'
import { promptPayPayload, isValidPromptPay } from '../lib/promptpay'
import { Modal, QR, REQUEST_LABEL, STATUS_LABEL, fmtMin, minutesSince, money, useRealtime, useTick } from './common'
import { Icon } from '../components/Icons'

type DTable = { id: number; name: string; seats: number; qr_code: string }
type LiveSession = {
  id: number; table_id: number; pin: string; customer_token: string; status: 'open' | 'bill_requested'
  guests: number | null; opened_at: string
  orders: { id: number; status: string; created_at: string; note: string; order_items: { name: string; qty: number; unit_price: number }[] }[]
  service_requests: { id: number; type: string; status: string; created_at: string }[]
}

const sessionTotal = (s: LiveSession) =>
  s.orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.order_items.reduce((a, i) => a + i.qty * Number(i.unit_price), 0), 0)

export default function Tables() {
  useTick()
  const [tables, setTables] = useState<DTable[]>([])
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [promptpay, setPromptpay] = useState('')
  const [openedPin, setOpenedPin] = useState<{ table: string; pin: string } | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const [t, s, st] = await Promise.all([
      supabase.from('dining_tables').select('id,name,seats,qr_code').eq('is_active', true).order('sort_order'),
      supabase.from('table_sessions')
        .select('id,table_id,pin,customer_token,status,guests,opened_at,orders(id,status,created_at,note,order_items(name,qty,unit_price)),service_requests(id,type,status,created_at)')
        .neq('status', 'closed'),
      supabase.from('shop_settings').select('promptpay_id').maybeSingle(),
    ])
    if (t.data) setTables(t.data)
    if (s.data) setSessions(s.data as LiveSession[])
    if (st.data) setPromptpay(st.data.promptpay_id)
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime(['table_sessions', 'orders', 'order_items', 'service_requests'], load, 'tables')

  const byTable = useMemo(() => new Map(sessions.map((s) => [s.table_id, s])), [sessions])

  const openTable = async (t: DTable) => {
    setErr('')
    const { data, error } = await supabase.rpc('open_table', { p_table_id: t.id, p_guests: null })
    if (error) { setErr(errText(error)); return }
    setOpenedPin({ table: t.name, pin: data.pin })
    load()
  }

  const detail = detailId ? sessions.find((s) => s.id === detailId) : null
  const detailTable = detail ? tables.find((t) => t.id === detail.table_id) : null

  const busyCount = sessions.length
  const billCount = sessions.filter((s) => s.status === 'bill_requested').length

  return (
    <div className="a-page">
      <div className="a-page-head">
        <h1 className="with-ico"><Icon name="table" size={26} /> โต๊ะ</h1>
        <p className="a-muted">ใช้อยู่ {busyCount}/{tables.length} โต๊ะ{billCount > 0 && <> · <strong className="a-warn-text">รอเช็คบิล {billCount}</strong></>}</p>
      </div>
      {err && <p className="a-error">{err}</p>}

      <div className="a-table-grid">
        {tables.map((t) => {
          const s = byTable.get(t.id)
          if (!s) return (
            <button key={t.id} className="a-tcard free" onClick={() => openTable(t)}>
              <span className="a-tname">{t.name}</span>
              <span className="a-muted">ว่าง · {t.seats} ที่นั่ง</span>
              <span className="a-tcta">เปิดโต๊ะ</span>
            </button>
          )
          const openReq = s.service_requests.filter((r) => r.status === 'open')
          const active = s.orders.filter((o) => ['pending', 'preparing', 'serving'].includes(o.status)).length
          return (
            <button key={t.id} className={`a-tcard busy ${s.status === 'bill_requested' ? 'bill' : ''}`} onClick={() => setDetailId(s.id)}>
              <span className="a-tname">{t.name}</span>
              <span className="a-tmoney">{money(sessionTotal(s))}</span>
              <span className="a-muted small">นั่งมา {fmtMin(minutesSince(s.opened_at))} · รหัส {s.pin}</span>
              <span className="a-chips">
                {s.status === 'bill_requested' && <span className="a-chip warn">รอเช็คบิล</span>}
                {active > 0 && <span className="a-chip">รอเสิร์ฟ {active}</span>}
                {openReq.filter((r) => r.type !== 'bill').map((r) => <span key={r.id} className="a-chip alert">{REQUEST_LABEL[r.type]}</span>)}
              </span>
            </button>
          )
        })}
      </div>

      {openedPin && (
        <Modal title={`เปิด${openedPin.table}แล้ว`} onClose={() => setOpenedPin(null)}>
          <p className="a-muted">บอกรหัสนี้ให้ลูกค้า ใส่หลังสแกน QR บนโต๊ะ</p>
          <p className="a-pin">{openedPin.pin}</p>
          <button className="a-btn primary wide" onClick={() => setOpenedPin(null)}>เรียบร้อย</button>
        </Modal>
      )}

      {detail && detailTable && (
        <SessionDetail
          key={detail.id} s={detail} table={detailTable} promptpay={promptpay}
          onClose={() => setDetailId(null)} onChanged={load}
        />
      )}
    </div>
  )
}

function SessionDetail({ s, table, promptpay, onClose, onChanged }: {
  s: LiveSession; table: DTable; promptpay: string; onClose: () => void; onChanged: () => void
}) {
  const total = sessionTotal(s)
  const [paying, setPaying] = useState(false)
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash')
  const [received, setReceived] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)

  const openReq = s.service_requests.filter((r) => r.status === 'open' && r.type !== 'bill')
  const orders = [...s.orders].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const hasPending = s.orders.some((o) => ['pending', 'preparing', 'serving'].includes(o.status))

  const doneRequest = async (id: number) => {
    await supabase.from('service_requests').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', id)
    onChanged()
  }

  const orderForTable = () => {
    try { localStorage.setItem(`mk_token_${table.qr_code}`, s.customer_token) } catch { /* ignore */ }
    window.open(`/t/${table.qr_code}`, '_blank', 'noopener')
  }

  const close = async (amount: number, m: 'cash' | 'transfer') => {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('close_session', { p_session_id: s.id, p_method: m, p_amount: amount })
    setBusy(false)
    if (error) { setErr(errText(error)); return }
    onChanged(); onClose()
  }

  const change = Number(received || 0) - total

  return (
    <Modal title={table.name} onClose={onClose}>
      <div className="a-detail-top">
        <div><span className="a-muted small">รหัสโต๊ะ</span><p className="a-pin sm">{s.pin}</p></div>
        <div className="right"><span className="a-muted small">ยอดรวม</span><p className="a-big">{money(total)}</p></div>
      </div>

      {openReq.length > 0 && (
        <div className="a-reqs">
          {openReq.map((r) => (
            <div key={r.id} className="a-req">
              <span>{REQUEST_LABEL[r.type]} <small className="a-muted">· {fmtMin(minutesSince(r.created_at))}</small></span>
              <button className="a-btn sm" onClick={() => doneRequest(r.id)}>เสร็จ</button>
            </div>
          ))}
        </div>
      )}

      <div className="a-orders">
        {orders.length === 0 && <p className="a-muted">ยังไม่มีออเดอร์</p>}
        {orders.map((o, i) => (
          <div key={o.id} className={`a-order ${o.status}`}>
            <div className="a-order-head">
              <strong>ออเดอร์ {i + 1}</strong>
              <span className={`a-status ${o.status}`}>{STATUS_LABEL[o.status]}</span>
            </div>
            <ul>{o.order_items.map((it, k) => <li key={k}><span>{it.qty} × {it.name}</span><span>{money(it.qty * Number(it.unit_price))}</span></li>)}</ul>
            {o.note && <p className="a-muted small">หมายเหตุ: {o.note}</p>}
          </div>
        ))}
      </div>

      <button className="a-btn ghost wide" onClick={orderForTable}>สั่งแทนลูกค้า (เปิดหน้าสั่งของโต๊ะนี้)</button>

      {!paying ? (
        orders.length === 0 ? (
          confirmCancel ? (
            <div className="a-row">
              <button className="a-btn ghost" onClick={() => setConfirmCancel(false)}>ไม่ใช่</button>
              <button className="a-btn danger" disabled={busy} onClick={() => close(0, 'cash')}>ยืนยันปิดโต๊ะ</button>
            </div>
          ) : <button className="a-btn ghost wide" onClick={() => setConfirmCancel(true)}>ปิดโต๊ะ (ลูกค้าไม่ได้สั่ง)</button>
        ) : (
          <button className="a-btn primary wide" onClick={() => { setPaying(true); setReceived(String(total)) }}>
            เช็คบิล {money(total)}
          </button>
        )
      ) : (
        <div className="a-pay">
          {hasPending && <p className="a-warn-text small">ยังมีออเดอร์ที่ยังไม่ได้เสิร์ฟ เช็คให้แน่ใจก่อนปิดบิล</p>}
          <div className="a-seg">
            <button className={method === 'cash' ? 'on' : ''} onClick={() => setMethod('cash')}>เงินสด</button>
            <button className={method === 'transfer' ? 'on' : ''} onClick={() => setMethod('transfer')}>โอน / พร้อมเพย์</button>
          </div>
          {method === 'cash' ? (
            <>
              <label className="a-field"><span>รับเงินมา</span>
                <input id="received" inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
              <div className="a-quick">
                {[total, 500, 1000].filter((v, i, a) => a.indexOf(v) === i && v >= total).map((v) => (
                  <button key={v} className="a-btn sm ghost" onClick={() => setReceived(String(v))}>{money(v)}</button>
                ))}
              </div>
              <p className="a-change">เงินทอน <strong className={change < 0 ? 'a-error' : ''}>{change < 0 ? 'ยังขาด ' + money(-change) : money(change)}</strong></p>
            </>
          ) : isValidPromptPay(promptpay) ? (
            <div className="a-ppqr">
              <QR value={promptPayPayload(promptpay, total)} size={220} />
              <p className="a-muted small">ให้ลูกค้าสแกนจ่าย {money(total)} แล้วดูสลิปก่อนกดปิดบิล</p>
            </div>
          ) : (
            <p className="a-muted">ยังไม่ได้ตั้งเลขพร้อมเพย์ ไปตั้งที่ ตั้งค่า → ร้าน เพื่อให้ขึ้น QR จ่ายเงินพร้อมยอด</p>
          )}
          {err && <p className="a-error">{err}</p>}
          <div className="a-row">
            <button className="a-btn ghost" onClick={() => setPaying(false)}>ย้อนกลับ</button>
            <button className="a-btn primary" disabled={busy || (method === 'cash' && change < 0)} onClick={() => close(total, method)}>
              {busy ? 'กำลังปิดบิล…' : 'ปิดบิล'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
