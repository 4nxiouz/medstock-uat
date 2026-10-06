import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, errText } from '../lib/supabase'
import { money, todayBkk } from './common'
import { Icon } from '../components/Icons'

type Summary = {
  tables: number; revenue: number; food_cost: number; waste_cost: number; operating_costs: number
  gross_profit: number; net_profit: number; food_cost_pct: number; paid_cash: number; paid_transfer: number
  top_items: { name: string; qty: number; revenue: number }[]
}
type Day = { day: string; tables: number; revenue: number; food_cost: number; waste_cost: number; operating_costs: number; net_profit: number }
type Stock = { ingredient_id: number; name: string; unit: string; purchase_unit: string; units_per_purchase: number; cost_per_unit: number; on_hand: number }
type Shop = { ingredient_id: number; name: string; need_qty: number; unit: string; on_hand: number; to_buy: number; purchase_unit: string; est_cost: number }
type Opex = { id: number; category: string; amount: number; note: string }

const OPEX_LABEL: Record<string, string> = { labor: 'ค่าแรงคนช่วย', electricity: 'ค่าไฟ/น้ำ', marketing: 'โฆษณา', repair: 'ซ่อม/ของใช้', other: 'อื่น ๆ' }
const QUIT_TARGET = 29000 // กำไรต่อเดือนที่ต้องได้ก่อนคิดลาออก
const STOP_TABLES = 4 // เกณฑ์เลิก: โต๊ะเฉลี่ยต่อวันที่เปิด

const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }

export default function Report() {
  const [date, setDate] = useState(todayBkk())
  const [sum, setSum] = useState<Summary | null>(null)
  const [series, setSeries] = useState<Day[]>([])
  const [stock, setStock] = useState<Stock[]>([])
  const [shop, setShop] = useState<Shop[]>([])
  const [opex, setOpex] = useState<Opex[]>([])
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    const [s, d, st, sh, ox] = await Promise.all([
      supabase.rpc('daily_summary', { p_date: date }),
      supabase.rpc('daily_series', { p_days: 28 }),
      supabase.from('stock_on_hand').select('ingredient_id,name,unit,purchase_unit,units_per_purchase,cost_per_unit,on_hand').order('ingredient_id'),
      supabase.rpc('shopping_list', { p_date: addDays(date, 1), p_buffer: 0.1 }),
      supabase.from('operating_costs').select('id,category,amount,note').eq('cost_date', date).order('id'),
    ])
    if (s.error) setErr(errText(s.error))
    setSum(s.data as Summary); setSeries((d.data as Day[]) ?? []); setStock((st.data as Stock[]) ?? [])
    setShop((sh.data as Shop[]) ?? []); setOpex((ox.data as Opex[]) ?? [])
  }, [date])
  useEffect(() => { load() }, [load])

  const openDays = series.filter((d) => d.tables > 0)
  const avgTables = openDays.length ? openDays.reduce((a, d) => a + Number(d.tables), 0) / openDays.length : 0
  const profit28 = series.reduce((a, d) => a + Number(d.net_profit), 0)
  const monthPace = profit28 * 30 / 28
  const shopTotal = shop.reduce((a, r) => a + Number(r.est_cost), 0)

  return (
    <div className="a-page">
      <div className="a-page-head">
        <h1 className="with-ico"><Icon name="chart" size={26} /> สรุปยอด</h1>
        <div className="a-row">
          <button className="a-btn sm ghost" onClick={() => setDate(addDays(date, -1))} aria-label="วันก่อน">‹</button>
          <input id="report-date" type="date" className="a-input" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="a-btn sm ghost" onClick={() => setDate(addDays(date, 1))} aria-label="วันถัดไป">›</button>
        </div>
      </div>
      {err && <p className="a-error">{err}</p>}

      {sum && (
        <>
          <div className="a-stats">
            <Stat k="ยอดขาย" v={money(sum.revenue)} s={`${sum.tables} โต๊ะ`} />
            <Stat k="ต้นทุนวัตถุดิบ" v={money(sum.food_cost)} s={`${(Number(sum.food_cost_pct) * 100).toFixed(0)}% ของยอดขาย`} />
            <Stat k="ของเสีย + ค่าใช้จ่ายอื่น" v={money(Number(sum.waste_cost) + Number(sum.operating_costs))} s={`ของเสีย ${money(sum.waste_cost)}`} />
            <Stat k="กำไรสุทธิวันนี้" v={money(sum.net_profit)} s={`เงินสด ${money(sum.paid_cash)} · โอน ${money(sum.paid_transfer)}`} hero neg={Number(sum.net_profit) < 0} />
          </div>
          {sum.top_items.length > 0 && (
            <section className="a-section">
              <h2>ขายดีวันนี้</h2>
              <div className="a-scroll">
                <table className="a-tbl">
                  <thead><tr><th>เมนู</th><th className="num">จำนวน</th><th className="num">ยอดขาย</th></tr></thead>
                  <tbody>{sum.top_items.map((t) => <tr key={t.name}><td>{t.name}</td><td className="num">{t.qty}</td><td className="num">{money(t.revenue)}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <section className="a-section">
        <h2>28 วันล่าสุด</h2>
        <div className="a-stats">
          <Stat k="โต๊ะเฉลี่ยต่อวันที่เปิด" v={avgTables.toFixed(1)} s={avgTables >= STOP_TABLES ? `ผ่านเกณฑ์ ${STOP_TABLES} โต๊ะ` : openDays.length ? `ต่ำกว่าเกณฑ์ ${STOP_TABLES} โต๊ะ` : 'ยังไม่มีข้อมูล'} warn={openDays.length > 0 && avgTables < STOP_TABLES} />
          <Stat k="กำไร 28 วัน" v={money(profit28)} s={`คิดเป็นเดือนละ ~${money(monthPace)}`} />
          <Stat k="เทียบเป้าลาออก" v={`${Math.max(0, Math.round((monthPace / QUIT_TARGET) * 100))}%`} s={`เป้า ${money(QUIT_TARGET)}/เดือน`} />
        </div>
        <TablesChart days={series} />
      </section>

      <OpexBlock date={date} rows={opex} onChanged={load} />
      <StockBlock stock={stock} onChanged={load} />

      <section className="a-section">
        <h2>ซื้ออะไรพรุ่งนี้ ({addDays(date, 1)})</h2>
        {shop.length === 0 ? (
          <p className="a-muted">ยังไม่มีประวัติขายของวันเดียวกันในสัปดาห์ก่อน ๆ ระบบจะคาดการณ์ได้หลังเปิดร้านครบ 1 สัปดาห์ ระหว่างนี้ใช้ชีท รายการซื้อ ในไฟล์ Excel ไปก่อน</p>
        ) : (
          <>
            <p className="a-muted small">คาดจากยอดขายวันเดียวกันของ 4 สัปดาห์ก่อน + เผื่อ 10% หักของที่เหลือในตู้แล้ว</p>
            <div className="a-scroll">
              <table className="a-tbl">
                <thead><tr><th>วัตถุดิบ</th><th className="num">คาดว่าใช้</th><th className="num">เหลือในตู้</th><th className="num">ต้องซื้อ</th><th className="num">ประมาณ</th></tr></thead>
                <tbody>
                  {shop.map((r) => (
                    <tr key={r.ingredient_id} className={Number(r.to_buy) === 0 ? 'dim' : ''}>
                      <td>{r.name}</td>
                      <td className="num">{fmtQty(r.need_qty, r.unit)}</td>
                      <td className="num">{fmtQty(Math.max(0, r.on_hand), r.unit)}</td>
                      <td className="num"><strong>{Number(r.to_buy) > 0 ? `${r.to_buy} ${r.purchase_unit}` : 'พอแล้ว'}</strong></td>
                      <td className="num">{money(r.est_cost)}</td>
                    </tr>
                  ))}
                  <tr className="total"><td colSpan={4}>รวมประมาณ</td><td className="num">{money(shopTotal)}</td></tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

const fmtQty = (q: number, unit: string) => unit === 'g' ? `${(Number(q) / 1000).toFixed(2)} กก.` : `${Number(q).toFixed(0)} ${unit}`

function Stat({ k, v, s, hero, neg, warn }: { k: string; v: string; s?: string; hero?: boolean; neg?: boolean; warn?: boolean }) {
  return (
    <div className={`a-stat ${hero ? 'hero' : ''} ${warn ? 'warn' : ''}`}>
      <span className="k">{k}</span>
      <span className={`v ${neg ? 'a-error' : ''}`}>{v}</span>
      {s && <span className="s">{s}</span>}
    </div>
  )
}

function TablesChart({ days }: { days: Day[] }) {
  const max = Math.max(STOP_TABLES + 2, ...days.map((d) => Number(d.tables)))
  const W = 560, H = 160, pad = 24, bw = (W - pad) / Math.max(days.length, 1)
  const y = (v: number) => H - 18 - (v / max) * (H - 30)
  return (
    <div className="a-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="จำนวนโต๊ะต่อวัน 28 วันล่าสุด">
        <line x1={pad} x2={W} y1={y(STOP_TABLES)} y2={y(STOP_TABLES)} className="a-ref" />
        <text x={pad + 4} y={y(STOP_TABLES) - 4} className="a-reflabel">เกณฑ์ {STOP_TABLES} โต๊ะ</text>
        {days.map((d, i) => {
          const v = Number(d.tables)
          const dt = new Date(d.day + 'T00:00:00Z')
          return (
            <g key={d.day}>
              {v > 0 && <rect x={pad + i * bw + 2} width={Math.max(bw - 4, 2)} y={y(v)} height={H - 18 - y(v)} rx={2} className={v >= STOP_TABLES ? 'a-bar ok' : 'a-bar low'}><title>{d.day}: {v} โต๊ะ</title></rect>}
              {v > 0 && <text x={pad + i * bw + bw / 2} y={y(v) - 3} className="a-barlabel">{v}</text>}
              {dt.getUTCDay() === 6 && <text x={pad + i * bw + bw / 2} y={H - 4} className="a-axis">{dt.getUTCDate()}/{dt.getUTCMonth() + 1}</text>}
            </g>
          )
        })}
      </svg>
      <p className="a-muted small">แท่งเขียว = ถึงเกณฑ์ · แท่งส้ม = ต่ำกว่าเกณฑ์ · วันที่ใต้แกนคือวันเสาร์</p>
    </div>
  )
}

function OpexBlock({ date, rows, onChanged }: { date: string; rows: Opex[]; onChanged: () => void }) {
  const [cat, setCat] = useState('labor')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const add = async () => {
    if (!Number(amount)) { setErr('ใส่จำนวนเงิน'); return }
    const { error } = await supabase.from('operating_costs').insert({ cost_date: date, category: cat, amount: Number(amount), note })
    if (error) { setErr(errText(error)); return }
    setAmount(''); setNote(''); setErr(''); onChanged()
  }
  const del = async (id: number) => { await supabase.from('operating_costs').delete().eq('id', id); onChanged() }
  return (
    <section className="a-section">
      <h2>ค่าใช้จ่ายวันนี้</h2>
      <p className="a-muted small">ค่าแรงคนช่วย ค่าไฟ ค่าโฆษณา ฯลฯ ที่ไม่ได้อยู่ในสูตรเมนู (ถ่าน น้ำแข็ง คิดในสูตรเซ็ตแล้ว)</p>
      <div className="a-row wrap">
        <select id="opex-cat" className="a-input" value={cat} onChange={(e) => setCat(e.target.value)}>
          {Object.entries(OPEX_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input id="opex-amount" className="a-input short" inputMode="decimal" placeholder="บาท" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
        <input id="opex-note" className="a-input" placeholder="หมายเหตุ" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="a-btn primary" onClick={add}>บันทึก</button>
      </div>
      {err && <p className="a-error">{err}</p>}
      {rows.length > 0 && (
        <ul className="a-plain">
          {rows.map((r) => <li key={r.id}><span>{OPEX_LABEL[r.category]}{r.note && ` · ${r.note}`}</span><span>{money(r.amount)} <button className="a-link" onClick={() => del(r.id)}>ลบ</button></span></li>)}
        </ul>
      )}
    </section>
  )
}

function StockBlock({ stock, onChanged }: { stock: Stock[]; onChanged: () => void }) {
  const [mode, setMode] = useState<'purchase' | 'waste'>('purchase')
  const [ingId, setIngId] = useState(0)
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [updatePrice, setUpdatePrice] = useState(true)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const ing = useMemo(() => stock.find((s) => s.ingredient_id === ingId), [stock, ingId])

  const submit = async () => {
    setErr(''); setMsg('')
    if (!ing || !Number(qty)) { setErr('เลือกวัตถุดิบและใส่จำนวน'); return }
    const units = Number(qty) * Number(ing.units_per_purchase)
    if (mode === 'purchase') {
      const total = Number(cost || 0)
      const { error } = await supabase.from('stock_movements').insert({ ingredient_id: ing.ingredient_id, type: 'purchase', qty: units, total_cost: total })
      if (error) { setErr(errText(error)); return }
      if (updatePrice && total > 0) {
        await supabase.from('ingredients').update({ price_per_purchase: +(total / Number(qty)).toFixed(2), updated_at: new Date().toISOString() }).eq('id', ing.ingredient_id)
      }
      setMsg(`บันทึกซื้อ ${ing.name} ${qty} ${ing.purchase_unit} แล้ว`)
    } else {
      const { error } = await supabase.from('stock_movements').insert({ ingredient_id: ing.ingredient_id, type: 'waste', qty: units, total_cost: +(units * Number(ing.cost_per_unit)).toFixed(2) })
      if (error) { setErr(errText(error)); return }
      setMsg(`บันทึกของเสีย ${ing.name} ${qty} ${ing.purchase_unit} แล้ว`)
    }
    setQty(''); setCost(''); onChanged()
  }

  return (
    <section className="a-section">
      <h2>สต็อก</h2>
      <div className="a-seg small">
        <button className={mode === 'purchase' ? 'on' : ''} onClick={() => setMode('purchase')}>บันทึกซื้อของเข้า</button>
        <button className={mode === 'waste' ? 'on' : ''} onClick={() => setMode('waste')}>บันทึกของเสีย</button>
      </div>
      <div className="a-row wrap">
        <select id="stock-ing" className="a-input" value={ingId} onChange={(e) => setIngId(Number(e.target.value))}>
          <option value={0}>เลือกวัตถุดิบ</option>
          {stock.map((s) => <option key={s.ingredient_id} value={s.ingredient_id}>{s.name}</option>)}
        </select>
        <input id="stock-qty" className="a-input short" inputMode="decimal" placeholder={`จำนวน (${ing?.purchase_unit ?? 'หน่วย'})`} value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} />
        {mode === 'purchase' && <input id="stock-cost" className="a-input short" inputMode="decimal" placeholder="จ่ายไป (บาท)" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ''))} />}
        <button className="a-btn primary" onClick={submit}>บันทึก</button>
      </div>
      {mode === 'purchase' && <label className="a-check small"><input type="checkbox" checked={updatePrice} onChange={(e) => setUpdatePrice(e.target.checked)} /> อัปเดตราคาวัตถุดิบตามที่ซื้อครั้งนี้</label>}
      {msg && <p className="a-ok">{msg}</p>}
      {err && <p className="a-error">{err}</p>}
      <div className="a-scroll">
        <table className="a-tbl">
          <thead><tr><th>วัตถุดิบ</th><th className="num">เหลือ (ประมาณ)</th></tr></thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.ingredient_id} className={Number(s.on_hand) <= 0 ? 'dim' : ''}>
                <td>{s.name}</td>
                <td className="num">{Number(s.on_hand) <= 0 ? '-' : s.unit === 'g' ? `${(Number(s.on_hand) / 1000).toFixed(2)} กก.` : `${Math.round(Number(s.on_hand))} ${s.unit}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="a-muted small">เหลือ = ซื้อเข้า − ใช้ตามสูตรของออเดอร์ − ของเสีย ถ้าตัวเลขไม่ตรงของจริง แปลว่าสูตรกับของที่ใส่จริงต่างกัน</p>
    </section>
  )
}
