import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, errText } from '../lib/supabase'
import { useStaff } from './useStaff'
import { Modal, money } from './common'
import { Icon } from '../components/Icons'
import { MenuThumb } from '../components/Food'

type Cat = { id: number; name: string; sort_order: number; is_active: boolean }
type Item = {
  id: number; category_id: number; name: string; description: string; price: number; kind: string
  serves: number | null; image_url: string | null; is_available: boolean; is_active: boolean; sort_order: number
}
type Ing = {
  id: number; name: string; unit: string; purchase_unit: string; units_per_purchase: number
  price_per_purchase: number; loss_pct: number; cost_per_unit: number; is_active: boolean
}
type Rec = { menu_item_id: number; ingredient_id: number; qty: number }
type Buy = { ingredient_id: number; qty: number; total_cost: number; created_at: string }

const KIND_LABEL: Record<string, string> = { set: 'เซ็ต', addon: 'สั่งเพิ่ม', drink: 'เครื่องดื่ม', other: 'อื่น ๆ' }

export default function Menu() {
  const { isOwner } = useStaff()
  const [tab, setTab] = useState<'menu' | 'ing'>('menu')
  const [cats, setCats] = useState<Cat[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [ings, setIngs] = useState<Ing[]>([])
  const [recs, setRecs] = useState<Rec[]>([])
  const [buys, setBuys] = useState<Buy[]>([])
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [newCat, setNewCat] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const [c, i, g, r, b] = await Promise.all([
      supabase.from('menu_categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('*').order('sort_order'),
      supabase.from('ingredients').select('*').order('id'),
      supabase.from('recipes').select('*'),
      supabase.from('stock_movements').select('ingredient_id,qty,total_cost,created_at').eq('type', 'purchase').gt('total_cost', 0)
        .order('created_at', { ascending: false }).limit(1000),
    ])
    if (c.data) setCats(c.data); if (i.data) setItems(i.data)
    if (g.data) setIngs(g.data); if (r.data) setRecs(r.data); if (b.data) setBuys(b.data)
  }, [])
  useEffect(() => { load() }, [load])

  const costOf = useMemo(() => {
    const map = new Map(ings.map((x) => [x.id, Number(x.cost_per_unit)]))
    const out = new Map<number, number>()
    recs.forEach((r) => out.set(r.menu_item_id, (out.get(r.menu_item_id) ?? 0) + Number(r.qty) * (map.get(r.ingredient_id) ?? 0)))
    return out
  }, [ings, recs])

  const toggleAvail = async (it: Item) => {
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, is_available: !x.is_available } : x)))
    const { error } = await supabase.from('menu_items').update({ is_available: !it.is_available, updated_at: new Date().toISOString() }).eq('id', it.id)
    if (error) { setErr(errText(error)); load() }
  }

  // ---- category order / rename / hide (owner only) ----
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null)

  const moveCat = async (id: number, dir: -1 | 1) => {
    const list = [...cats]
    const i = list.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    const renumbered = list.map((c, k) => ({ ...c, sort_order: k + 1 }))
    setCats(renumbered)
    const changed = renumbered.filter((c) => cats.find((o) => o.id === c.id)?.sort_order !== c.sort_order)
    const results = await Promise.all(changed.map((c) => supabase.from('menu_categories').update({ sort_order: c.sort_order }).eq('id', c.id)))
    const bad = results.find((r) => r.error)
    if (bad?.error) { setErr(errText(bad.error)); load() }
  }

  const saveCatName = async () => {
    if (!renaming) return
    const name = renaming.name.trim()
    if (!name) { setRenaming(null); return }
    setCats((xs) => xs.map((c) => (c.id === renaming.id ? { ...c, name } : c)))
    setRenaming(null)
    const { error } = await supabase.from('menu_categories').update({ name }).eq('id', renaming.id)
    if (error) { setErr(errText(error)); load() }
  }

  const toggleCat = async (c: Cat) => {
    setCats((xs) => xs.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)))
    const { error } = await supabase.from('menu_categories').update({ is_active: !c.is_active }).eq('id', c.id)
    if (error) { setErr(errText(error)); load() }
  }

  const addCat = async () => {
    if (!newCat.trim()) return
    const { error } = await supabase.from('menu_categories').insert({ name: newCat.trim(), sort_order: Math.max(0, ...cats.map((c) => c.sort_order)) + 1 })
    if (error) setErr(errText(error)); else { setNewCat(''); load() }
  }

  return (
    <div className="a-page">
      <div className="a-page-head">
        <h1 className="with-ico"><Icon name="menu" size={26} /> เมนู</h1>
        <div className="a-seg small">
          <button className={tab === 'menu' ? 'on' : ''} onClick={() => setTab('menu')}>รายการอาหาร</button>
          <button className={tab === 'ing' ? 'on' : ''} onClick={() => setTab('ing')}>วัตถุดิบและราคา</button>
        </div>
      </div>
      {err && <p className="a-error">{err}</p>}

      {tab === 'menu' && (
        <>
          {isOwner && <div className="a-row wrap"><button className="a-btn primary" onClick={() => setEditing('new')}>+ เพิ่มเมนู</button></div>}
          {cats.map((c, idx) => (
            <section key={c.id} className={`a-section ${c.is_active ? '' : 'a-cat-off'}`}>
              <div className="a-cat-head">
                {renaming?.id === c.id ? (
                  <form className="a-row" onSubmit={(e) => { e.preventDefault(); saveCatName() }}>
                    <input id={`cat-name-${c.id}`} className="a-input" autoFocus value={renaming.name}
                      onChange={(e) => setRenaming({ id: c.id, name: e.target.value })} onBlur={saveCatName} />
                  </form>
                ) : (
                  <h2>{c.name}{!c.is_active && <span className="a-chip">ซ่อนจากลูกค้า</span>}</h2>
                )}
                {isOwner && (
                  <div className="a-cat-tools">
                    <button className="a-icon-btn" onClick={() => moveCat(c.id, -1)} disabled={idx === 0} aria-label={`เลื่อน ${c.name} ขึ้น`} title="เลื่อนขึ้น"><Icon name="up" size={18} /></button>
                    <button className="a-icon-btn" onClick={() => moveCat(c.id, 1)} disabled={idx === cats.length - 1} aria-label={`เลื่อน ${c.name} ลง`} title="เลื่อนลง"><Icon name="down" size={18} /></button>
                    <button className="a-icon-btn" onClick={() => setRenaming({ id: c.id, name: c.name })} aria-label={`เปลี่ยนชื่อ ${c.name}`} title="เปลี่ยนชื่อ"><Icon name="pencil" size={18} /></button>
                    <button className="a-icon-btn" onClick={() => toggleCat(c)} aria-label={c.is_active ? `ซ่อน ${c.name}` : `แสดง ${c.name}`} title={c.is_active ? 'ซ่อนจากลูกค้า' : 'แสดงให้ลูกค้าเห็น'}><Icon name={c.is_active ? 'eye' : 'eyeOff'} size={18} /></button>
                  </div>
                )}
              </div>
              <div className="a-list">
                {items.filter((i) => i.category_id === c.id).map((i) => {
                  const cost = costOf.get(i.id) ?? 0
                  const pct = Number(i.price) > 0 ? cost / Number(i.price) : 0
                  return (
                    <div key={i.id} className={`a-mrow ${i.is_active ? '' : 'inactive'}`}>
                      <MenuThumb name={i.name} kind={i.kind} imageUrl={i.image_url} className="a-thumb" />
                      <div className="a-mrow-body">
                        <strong>{i.name}</strong>{!i.is_active && <span className="a-chip">ซ่อนอยู่</span>}
                        <span className="a-muted small">{money(i.price)}{isOwner && <> · ต้นทุน {money(cost)} {Number(i.price) > 0 && <span className={pct > 0.55 ? 'a-warn-text' : ''}>({(pct * 100).toFixed(0)}%)</span>}</>}</span>
                      </div>
                      <button className={`a-toggle ${i.is_available ? 'on' : ''}`} onClick={() => toggleAvail(i)} aria-pressed={!i.is_available}>
                        {i.is_available ? 'มีขาย' : 'หมด'}
                      </button>
                      {isOwner && <button className="a-btn sm ghost" onClick={() => setEditing(i)}>แก้ไข</button>}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
          {isOwner && (
            <div className="a-row wrap">
              <input id="new-cat" className="a-input" placeholder="ชื่อหมวดใหม่ เช่น ของทานเล่น" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
              <span className="a-muted small">ใช้ลูกศร ขึ้น/ลง ข้างชื่อหมวดเพื่อจัดลำดับที่ลูกค้าเห็น</span>
              <button className="a-btn ghost" onClick={addCat}>เพิ่มหมวด</button>
            </div>
          )}
        </>
      )}

      {tab === 'ing' && <Ingredients ings={ings} buys={buys} canEdit={isOwner} onChanged={load} />}

      {editing && (
        <ItemEditor
          item={editing === 'new' ? null : editing} cats={cats} ings={ings}
          recs={editing === 'new' ? [] : recs.filter((r) => r.menu_item_id === editing.id)}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function ItemEditor({ item, cats, ings, recs, onClose, onSaved }: {
  item: Item | null; cats: Cat[]; ings: Ing[]; recs: Rec[]; onClose: () => void; onSaved: () => void
}) {
  const [f, setF] = useState({
    name: item?.name ?? '', description: item?.description ?? '', price: String(item?.price ?? ''),
    category_id: item?.category_id ?? cats[0]?.id ?? 0, kind: item?.kind ?? 'addon', serves: item?.serves ? String(item.serves) : '',
    sort_order: String(item?.sort_order ?? 0), is_active: item?.is_active ?? true, image_url: item?.image_url ?? '',
  })
  const [lines, setLines] = useState(recs.map((r) => ({ ingredient_id: r.ingredient_id, qty: String(r.qty) })))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ingMap = new Map(ings.map((x) => [x.id, x]))
  const cost = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(ingMap.get(l.ingredient_id)?.cost_per_unit ?? 0), 0)
  const price = Number(f.price || 0)

  const upload = async (file: File) => {
    setBusy(true); setErr('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('menu-images').upload(path, file, { contentType: file.type, upsert: false })
    setBusy(false)
    if (error) { setErr(errText(error)); return }
    setF((x) => ({ ...x, image_url: supabase.storage.from('menu-images').getPublicUrl(path).data.publicUrl }))
  }

  const save = async () => {
    if (!f.name.trim()) { setErr('ใส่ชื่อเมนู'); return }
    if (!(price >= 0) || f.price === '') { setErr('ใส่ราคา'); return }
    setBusy(true); setErr('')
    const row = {
      name: f.name.trim(), description: f.description.trim(), price, category_id: Number(f.category_id), kind: f.kind,
      serves: f.serves ? Number(f.serves) : null, sort_order: Number(f.sort_order || 0), is_active: f.is_active,
      image_url: f.image_url || null, updated_at: new Date().toISOString(),
    }
    let id = item?.id
    if (id) {
      const { error } = await supabase.from('menu_items').update(row).eq('id', id)
      if (error) { setBusy(false); setErr(errText(error)); return }
    } else {
      const { data, error } = await supabase.from('menu_items').insert(row).select('id').single()
      if (error) { setBusy(false); setErr(errText(error)); return }
      id = data.id
    }
    const clean = lines.filter((l) => l.ingredient_id && Number(l.qty) > 0)
    const merged = new Map<number, number>()
    clean.forEach((l) => merged.set(l.ingredient_id, (merged.get(l.ingredient_id) ?? 0) + Number(l.qty)))
    const del = await supabase.from('recipes').delete().eq('menu_item_id', id!)
    if (del.error) { setBusy(false); setErr(errText(del.error)); return }
    if (merged.size) {
      const ins = await supabase.from('recipes').insert([...merged].map(([ingredient_id, qty]) => ({ menu_item_id: id!, ingredient_id, qty })))
      if (ins.error) { setBusy(false); setErr(errText(ins.error)); return }
    }
    setBusy(false); onSaved()
  }

  return (
    <Modal title={item ? `แก้ไข ${item.name}` : 'เพิ่มเมนู'} onClose={onClose}>
      <div className="a-form">
        <label className="a-field"><span>ชื่อเมนู</span><input id="m-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="a-field"><span>รายละเอียด (ลูกค้าเห็น)</span><input id="m-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <div className="a-grid2">
          <label className="a-field"><span>ราคา (บาท)</span><input id="m-price" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^\d.]/g, '') })} /></label>
          <label className="a-field"><span>หมวด</span>
            <select id="m-cat" value={f.category_id} onChange={(e) => setF({ ...f, category_id: Number(e.target.value) })}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="a-field"><span>ประเภท</span>
            <select id="m-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="a-field"><span>ลำดับที่แสดง</span><input id="m-sort" inputMode="numeric" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value.replace(/\D/g, '') })} /></label>
        </div>
        <label className="a-field"><span>รูป</span>
          <div className="a-row wrap">
            {f.image_url && <img src={f.image_url} alt="" className="a-thumb lg" />}
            <input id="m-img" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {f.image_url && <button className="a-link" onClick={() => setF({ ...f, image_url: '' })}>เอารูปออก</button>}
          </div>
        </label>
        <label className="a-check"><input id="m-active" type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> แสดงในเมนูลูกค้า</label>

        <h3>สูตร (ใช้คำนวณต้นทุนและตัดสต็อก)</h3>
        <div className="a-recipe">
          {lines.map((l, i) => {
            const ing = ingMap.get(l.ingredient_id)
            return (
              <div key={i} className="a-rline">
                <select value={l.ingredient_id} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, ingredient_id: Number(e.target.value) } : x)))}>
                  <option value={0}>เลือกวัตถุดิบ</option>
                  {ings.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <input inputMode="decimal" value={l.qty} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, qty: e.target.value.replace(/[^\d.]/g, '') } : x)))} />
                <span className="a-muted small">{ing?.unit ?? ''}</span>
                <span className="a-muted small num">{money(Number(l.qty || 0) * Number(ing?.cost_per_unit ?? 0))}</span>
                <button className="a-link" aria-label="ลบ" onClick={() => setLines(lines.filter((_, k) => k !== i))}>ลบ</button>
              </div>
            )
          })}
          <button className="a-btn sm ghost" onClick={() => setLines([...lines, { ingredient_id: 0, qty: '' }])}>+ เพิ่มวัตถุดิบ</button>
        </div>
        <p className="a-summary">
          ต้นทุน <strong>{money(cost)}</strong>
          {price > 0 && <> · คิดเป็น <strong className={cost / price > 0.55 ? 'a-warn-text' : ''}>{((cost / price) * 100).toFixed(0)}%</strong> ของราคา · กำไรต่อจาน <strong>{money(price - cost)}</strong></>}
        </p>
        {err && <p className="a-error">{err}</p>}
        <div className="a-row">
          <button className="a-btn ghost" onClick={onClose}>ยกเลิก</button>
          <button className="a-btn primary" disabled={busy} onClick={save}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        </div>
      </div>
    </Modal>
  )
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

function Ingredients({ ings, buys, canEdit, onChanged }: { ings: Ing[]; buys: Buy[]; canEdit: boolean; onChanged: () => void }) {
  // Price paid per purchase unit for the last purchases of each ingredient (newest first)
  const history = useMemo(() => {
    const m = new Map<number, { price: number; at: string }[]>()
    buys.forEach((b) => {
      const g = ings.find((x) => x.id === b.ingredient_id)
      if (!g || !Number(b.qty)) return
      const packs = Number(b.qty) / Number(g.units_per_purchase)
      if (!packs) return
      const list = m.get(b.ingredient_id) ?? []
      if (list.length < 6) list.push({ price: Number(b.total_cost) / packs, at: b.created_at })
      m.set(b.ingredient_id, list)
    })
    return m
  }, [buys, ings])

  const [rows, setRows] = useState<Record<number, Partial<Record<keyof Ing, string>>>>({})
  const [adding, setAdding] = useState({ name: '', unit: 'g', purchase_unit: 'กก.', units_per_purchase: '1000', price_per_purchase: '', loss_pct: '0' })
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState<number | null>(null)

  const val = (g: Ing, k: keyof Ing) => rows[g.id]?.[k] ?? (k === 'loss_pct' ? String(Math.round(Number(g.loss_pct) * 100)) : String(g[k]))
  const set = (id: number, k: keyof Ing, v: string) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }))

  const saveRow = async (g: Ing) => {
    const r = rows[g.id]; if (!r) return
    const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (r.price_per_purchase !== undefined) upd.price_per_purchase = Number(r.price_per_purchase)
    if (r.units_per_purchase !== undefined) upd.units_per_purchase = Number(r.units_per_purchase)
    if (r.loss_pct !== undefined) upd.loss_pct = Number(r.loss_pct) / 100
    if (r.name !== undefined) upd.name = r.name
    if (r.purchase_unit !== undefined) upd.purchase_unit = r.purchase_unit
    const { error } = await supabase.from('ingredients').update(upd).eq('id', g.id)
    if (error) { setErr(errText(error)); return }
    setRows((x) => { const n = { ...x }; delete n[g.id]; return n })
    setSaved(g.id); setTimeout(() => setSaved(null), 1500)
    onChanged()
  }

  const add = async () => {
    if (!adding.name.trim() || !adding.price_per_purchase) { setErr('ใส่ชื่อและราคา'); return }
    const { error } = await supabase.from('ingredients').insert({
      name: adding.name.trim(), unit: adding.unit, purchase_unit: adding.purchase_unit,
      units_per_purchase: Number(adding.units_per_purchase), price_per_purchase: Number(adding.price_per_purchase), loss_pct: Number(adding.loss_pct) / 100,
    })
    if (error) { setErr(errText(error)); return }
    setAdding({ name: '', unit: 'g', purchase_unit: 'กก.', units_per_purchase: '1000', price_per_purchase: '', loss_pct: '0' })
    onChanged()
  }

  return (
    <section className="a-section">
      <div className="a-howto">
        <strong>ราคาเปลี่ยนทุกสัปดาห์ ทำยังไง</strong>
        <ol>
          <li>ทุกครั้งที่ไปซื้อของ บันทึกที่ <b>สรุปยอด → สต็อก → บันทึกซื้อของเข้า</b> ใส่จำนวนกับเงินที่จ่ายจริง ระบบจะอัปเดตราคาในตารางนี้ให้เอง</li>
          <li>หรือแก้ช่อง <b>ราคาซื้อ</b> ในตารางนี้ตรง ๆ ได้ทุกเมื่อ (เช่น เบียร์ ใส่ราคาต่อลัง ระบบหาร 12 ให้)</li>
          <li>ออเดอร์ที่ขายไปแล้ว <b>จำต้นทุน ณ วันที่ขาย</b> ไว้ เปลี่ยนราคาวันนี้ ยอดกำไรเดือนก่อนจะไม่เพี้ยน</li>
        </ol>
        <span className="a-muted small">% สูญเสีย = ส่วนที่ตัดทิ้งตอนหั่น/ล้าง · คอลัมน์ "ซื้อครั้งก่อน ๆ" ดูว่าราคาขึ้นหรือลง</span>
      </div>
      {err && <p className="a-error">{err}</p>}
      <div className="a-scroll">
        <table className="a-tbl">
          <thead><tr><th>วัตถุดิบ</th><th>ซื้อเป็น</th><th className="num">ราคาซื้อ</th><th className="num">หน่วยใช้ต่อหน่วยซื้อ</th><th className="num">% สูญเสีย</th><th className="num">ต้นทุน/หน่วยใช้</th><th>ซื้อครั้งก่อน ๆ</th><th /></tr></thead>
          <tbody>
            {ings.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.purchase_unit}</td>
                <td className="num">{canEdit ? <input inputMode="decimal" value={val(g, 'price_per_purchase')} onChange={(e) => set(g.id, 'price_per_purchase', e.target.value.replace(/[^\d.]/g, ''))} /> : money(g.price_per_purchase)}</td>
                <td className="num">{canEdit ? <input inputMode="decimal" value={val(g, 'units_per_purchase')} onChange={(e) => set(g.id, 'units_per_purchase', e.target.value.replace(/[^\d.]/g, ''))} /> : g.units_per_purchase} <small className="a-muted">{g.unit}</small></td>
                <td className="num">{canEdit ? <input inputMode="decimal" value={val(g, 'loss_pct')} onChange={(e) => set(g.id, 'loss_pct', e.target.value.replace(/[^\d.]/g, ''))} /> : `${Math.round(g.loss_pct * 100)}%`}</td>
                <td className="num">{Number(g.cost_per_unit).toFixed(g.unit === 'g' ? 3 : 2)} <small className="a-muted">/{g.unit}</small></td>
                <td className="a-hist">{(history.get(g.id) ?? []).map((h, k, arr) => {
                  const prev = arr[k + 1]
                  const diff = prev ? h.price - prev.price : 0
                  return (
                    <span key={k} className={`a-hist-pill ${diff > 0.005 ? 'up' : diff < -0.005 ? 'down' : ''}`} title={`ซื้อเมื่อ ${shortDate(h.at)}`}>
                      {shortDate(h.at)} {money(Math.round(h.price * 100) / 100)}{diff > 0.005 ? ' ▲' : diff < -0.005 ? ' ▼' : ''}
                    </span>
                  )
                })}{!history.get(g.id) && <span className="a-muted small">ยังไม่มีบันทึกซื้อ</span>}</td>
                <td>{canEdit && rows[g.id] && <button className="a-btn sm primary" onClick={() => saveRow(g)}>บันทึก</button>}{saved === g.id && <span className="a-ok small">บันทึกแล้ว</span>}</td>
              </tr>
            ))}
            {canEdit && (
              <tr className="a-addrow">
                <td><input placeholder="ชื่อวัตถุดิบใหม่" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></td>
                <td><input value={adding.purchase_unit} onChange={(e) => setAdding({ ...adding, purchase_unit: e.target.value })} /></td>
                <td className="num"><input inputMode="decimal" placeholder="ราคา" value={adding.price_per_purchase} onChange={(e) => setAdding({ ...adding, price_per_purchase: e.target.value.replace(/[^\d.]/g, '') })} /></td>
                <td className="num"><input inputMode="decimal" value={adding.units_per_purchase} onChange={(e) => setAdding({ ...adding, units_per_purchase: e.target.value.replace(/[^\d.]/g, '') })} />
                  <input className="unit" value={adding.unit} onChange={(e) => setAdding({ ...adding, unit: e.target.value })} aria-label="หน่วยใช้" /></td>
                <td className="num"><input inputMode="decimal" value={adding.loss_pct} onChange={(e) => setAdding({ ...adding, loss_pct: e.target.value.replace(/[^\d.]/g, '') })} /></td>
                <td /><td />
                <td><button className="a-btn sm primary" onClick={add}>เพิ่ม</button></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
