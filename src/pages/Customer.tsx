import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, baht, errText, type Category, type MenuItem, type SessionView, type OrderStatus } from '../lib/supabase'
import { BrandMark, Lights } from '../components/Brand'
import { Icon, type IconName } from '../components/Icons'
import { MenuThumb } from '../components/Food'

const tokenKey = (qr: string) => `mk_token_${qr}`

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'รับออเดอร์แล้ว' },
  { key: 'preparing', label: 'กำลังเตรียม' },
  { key: 'serving', label: 'กำลังไปเสิร์ฟ' },
  { key: 'served', label: 'เสิร์ฟแล้ว' },
]

const SERVICES: { type: string; icon: IconName; label: string; hint: string }[] = [
  { type: 'change_pan', icon: 'pan', label: 'เปลี่ยนกระทะ', hint: 'ฟรี' },
  { type: 'refill_soup', icon: 'soup', label: 'เติมน้ำซุป', hint: 'ฟรี' },
  { type: 'call_staff', icon: 'bell', label: 'เรียกพนักงาน', hint: 'มาที่โต๊ะ' },
]

const isBeerPromo = (i: MenuItem) => i.name.includes('โปร') && i.name.includes('เบียร์')
const isIce = (i: MenuItem) => i.kind === 'drink' && i.name.includes('น้ำแข็ง') && !isBeerPromo(i)

type Phase = 'loading' | 'pin' | 'ready' | 'closed'

export default function Customer() {
  const { qr = '' } = useParams()
  const [phase, setPhase] = useState<Phase>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [session, setSession] = useState<SessionView | null>(null)
  const [cats, setCats] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCat, setActiveCat] = useState<number | null>(null)
  const [cart, setCart] = useState<Record<number, number>>({})
  const [tab, setTab] = useState<'menu' | 'orders'>('menu')
  const [cartOpen, setCartOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [toast, setToast] = useState('')
  const [askBill, setAskBill] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }

  // ---------- data ----------
  const loadMenu = useCallback(async () => {
    const [c, m] = await Promise.all([
      supabase.from('menu_categories').select('id,name,sort_order').eq('is_active', true).order('sort_order'),
      supabase.from('menu_items')
        .select('id,category_id,name,description,price,kind,serves,image_url,is_available,sort_order')
        .eq('is_active', true).order('sort_order'),
    ])
    if (c.data) { setCats(c.data); setActiveCat((prev) => prev ?? c.data[0]?.id ?? null) }
    if (m.data) setItems(m.data as MenuItem[])
  }, [])

  const loadSession = useCallback(async (tok: string) => {
    const { data, error } = await supabase.rpc('get_my_session', { p_token: tok })
    if (error || !data?.ok) return null
    return data as SessionView
  }, [])

  const refresh = useCallback(async () => {
    if (!token) return
    const s = await loadSession(token)
    if (!s || s.status === 'closed') {
      try { localStorage.removeItem(tokenKey(qr)) } catch { /* ignore */ }
      setPhase('closed')
      return
    }
    setSession(s)
  }, [token, qr, loadSession])

  // first load
  useEffect(() => {
    loadMenu()
    let saved: string | null = null
    try { saved = localStorage.getItem(tokenKey(qr)) } catch { /* ignore */ }
    if (!saved) { setPhase('pin'); return }
    loadSession(saved).then((s) => {
      if (s && s.status !== 'closed') { setToken(saved); setSession(s); setPhase('ready') }
      else {
        try { localStorage.removeItem(tokenKey(qr)) } catch { /* ignore */ }
        setPhase('pin')
      }
    })
  }, [qr, loadMenu, loadSession])

  // live status: broadcast from the database + a slow poll as a safety net
  useEffect(() => {
    if (phase !== 'ready' || !token) return
    const ch = supabase.channel(`session-${token}`)
      .on('broadcast', { event: 'order_status' }, () => refresh())
      .subscribe()
    const menuCh = supabase.channel('menu-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadMenu())
      .subscribe()
    const poll = window.setInterval(() => { refresh(); loadMenu() }, 15000)
    return () => { supabase.removeChannel(ch); supabase.removeChannel(menuCh); window.clearInterval(poll) }
  }, [phase, token, refresh, loadMenu])

  // ---------- actions ----------
  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) { setPinError('ใส่รหัส 4 หลักที่ได้จากพนักงาน'); return }
    setBusy(true); setPinError('')
    const { data, error } = await supabase.rpc('join_table', { p_qr: qr, p_pin: pin })
    setBusy(false)
    if (error) { setPinError(errText(error)); return }
    if (!data?.ok) { setPinError(data?.error ?? 'รหัสโต๊ะไม่ถูกต้อง'); setPin(''); return }
    try { localStorage.setItem(tokenKey(qr), data.token) } catch { /* ignore */ }
    setToken(data.token)
    const s = await loadSession(data.token)
    if (s) setSession(s)
    setPhase('ready')
  }

  const add = (id: number, d: number) =>
    setCart((c) => {
      const q = Math.max(0, Math.min(20, (c[id] ?? 0) + d))
      const next = { ...c }
      if (q === 0) delete next[id]; else next[id] = q
      return next
    })

  const cartLines = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ item: items.find((i) => i.id === Number(id))!, qty })).filter((l) => l.item),
    [cart, items],
  )
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0)
  const cartTotal = cartLines.reduce((s, l) => s + l.qty * Number(l.item.price), 0)

  // Beer promos are sold on their own. When a set is in the cart and the table has no beer yet,
  // offer the beer promos (and ice) as a separate add-on.
  const hasSet = cartLines.some((l) => l.item.kind === 'set')
  const hasBeerInCart = cartLines.some((l) => l.item.name.includes('เบียร์'))
  const orderedBeerBefore = session?.orders.some((o) => o.status !== 'cancelled' && o.items.some((it) => it.name.includes('เบียร์'))) ?? false
  const suggestions = hasSet && !hasBeerInCart && !orderedBeerBefore
    ? [...items.filter((i) => isBeerPromo(i) && i.is_available), ...items.filter((i) => isIce(i) && i.is_available && !cart[i.id])].slice(0, 3)
    : []
  const iceItem = items.find((i) => isIce(i) && i.is_available)

  const orderIce = () => {
    if (!iceItem) return
    add(iceItem.id, 1)
    setTab('menu'); setCartOpen(true)
    showToast(`ใส่${iceItem.name} ${baht(iceItem.price)} ในตะกร้าแล้ว กดสั่งได้เลย`)
  }

  const placeOrder = async () => {
    if (!token || cartLines.length === 0) return
    setBusy(true)
    const { error } = await supabase.rpc('place_order', {
      p_token: token,
      p_items: cartLines.map((l) => ({ menu_item_id: l.item.id, qty: l.qty })),
      p_note: note,
    })
    setBusy(false)
    if (error) { showToast(errText(error)); loadMenu(); return }
    setCart({}); setNote(''); setCartOpen(false); setTab('orders')
    showToast('ส่งออเดอร์แล้ว')
    refresh()
  }

  const requestService = async (type: string, label: string) => {
    if (!token) return
    const { error } = await supabase.rpc('request_service', { p_token: token, p_type: type })
    if (error) { showToast(errText(error)); return }
    showToast(type === 'bill' ? 'แจ้งพนักงานแล้ว รอเช็คบิลสักครู่' : `แจ้ง "${label}" แล้ว`)
    setAskBill(false)
    refresh()
  }

  // ---------- views ----------
  if (phase === 'loading') return <div className="screen center"><p className="muted">กำลังโหลด…</p></div>

  if (phase === 'closed') return (
    <div className="screen center">
      <div className="card narrow">
        <span className="hero-ico"><Icon name="moon" size={44} /></span>
        <h1 className="display">ขอบคุณที่มากินกันนะ</h1>
        <p className="muted">โต๊ะนี้ปิดบิลแล้ว ถ้าจะสั่งต่อ แจ้งพนักงานให้เปิดโต๊ะใหม่ได้เลย</p>
        <button className="btn ghost" onClick={() => { setPhase('pin'); setPin('') }}>ใส่รหัสโต๊ะใหม่</button>
      </div>
    </div>
  )

  if (phase === 'pin') return (
    <div className="screen center">
      <form className="card narrow" onSubmit={submitPin}>
        <BrandMark sub="ร้านลับริมน้ำ" />
        <h1 className="display">ใส่รหัสโต๊ะ</h1>
        <p className="muted">ขอรหัส 4 หลักจากพนักงานตอนเปิดโต๊ะ</p>
        <input
          id="pin" className="pin" inputMode="numeric" autoComplete="one-time-code" maxLength={4}
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••" aria-label="รหัสโต๊ะ 4 หลัก" autoFocus
        />
        {pinError && <p className="error">{pinError}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'กำลังตรวจสอบ…' : 'เริ่มสั่งอาหาร'}</button>
      </form>
    </div>
  )

  const activeOrders = session?.orders.filter((o) => o.status !== 'served' && o.status !== 'cancelled').length ?? 0

  return (
    <div className="screen">
      <Lights />
      <header className="topbar">
        <div>
          <p className="eyebrow">หมูกะทะริมน้ำ · ร้านลับริมน้ำ</p>
          <h1 className="table-name">{session?.table_name}</h1>
        </div>
        <div className="total-pill"><span className="muted small">ยอดโต๊ะ</span><strong>{baht(session?.total ?? 0)}</strong></div>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'menu'} className={tab === 'menu' ? 'on' : ''} onClick={() => setTab('menu')}>เมนู</button>
        <button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>
          ออเดอร์ของโต๊ะ{activeOrders > 0 && <span className="badge">{activeOrders}</span>}
        </button>
      </nav>

      {session?.status === 'bill_requested' && (
        <div className="banner">แจ้งเช็คบิลแล้ว พนักงานกำลังมา · สั่งเพิ่มไม่ได้จนกว่าจะเปิดโต๊ะใหม่</div>
      )}

      {tab === 'menu' && (
        <>
          <div className="chips">
            {cats.map((c) => (
              <button key={c.id} className={`chip ${activeCat === c.id ? 'on' : ''}`} onClick={() => setActiveCat(c.id)}>{c.name}</button>
            ))}
          </div>
          <main className="menu">
            {items.filter((i) => i.category_id === activeCat).map((i) => {
              const q = cart[i.id] ?? 0
              return (
                <article key={i.id} className={`item ${i.is_available ? '' : 'soldout'} ${i.kind === 'set' ? 'set' : ''}`}>
                  <MenuThumb name={i.name} kind={i.kind} imageUrl={i.image_url} className="thumb" />
                  <div className="item-body">
                    <h3>{i.name}</h3>
                    {i.description && <p className="muted small">{i.description}</p>}
                    <p className="price">{baht(i.price)}</p>
                  </div>
                  {i.is_available ? (
                    <div className="stepper">
                      {q > 0 && <button aria-label={`ลด ${i.name}`} onClick={() => add(i.id, -1)}>−</button>}
                      {q > 0 && <span>{q}</span>}
                      <button aria-label={`เพิ่ม ${i.name}`} className="plus" onClick={() => add(i.id, 1)}>+</button>
                    </div>
                  ) : <span className="soldout-tag">หมด</span>}
                </article>
              )
            })}
          </main>
        </>
      )}

      {tab === 'orders' && (
        <main className="orders">
          <section className="services">
            {SERVICES.map((s) => {
              const pending = session?.open_requests.includes(s.type)
              return (
                <button key={s.type} className={`service ${pending ? 'pending' : ''}`} onClick={() => requestService(s.type, s.label)} disabled={pending}>
                  <span className="service-ico"><Icon name={s.icon} size={22} /></span>
                  <span>{s.label}</span>
                  <small>{pending ? 'แจ้งแล้ว' : s.hint}</small>
                </button>
              )
            })}
            {iceItem && session?.status === 'open' && (
              <button className="service paid" onClick={orderIce}>
                <span className="service-ico"><Icon name="ice" size={22} /></span>
                <span>สั่งน้ำแข็ง</span>
                <small>ถังละ {baht(iceItem.price)}</small>
              </button>
            )}
          </section>

          {session?.orders.length === 0 && <p className="muted empty"><Icon name="pig" size={36} /><br />ยังไม่ได้สั่งอะไร ไปที่แท็บเมนูเพื่อเริ่มสั่ง</p>}

          {session?.orders.map((o, idx) => {
            const stepIdx = STEPS.findIndex((s) => s.key === o.status)
            return (
              <article key={o.id} className="order">
                <header>
                  <strong>ออเดอร์ที่ {session.orders.length - idx}</strong>
                  <span className="muted small">{new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                </header>
                {o.status === 'cancelled' ? (
                  <p className="error">ออเดอร์นี้ถูกยกเลิก</p>
                ) : (
                  <ol className="track">
                    {STEPS.map((s, i) => (
                      <li key={s.key} className={i < stepIdx ? 'done' : i === stepIdx ? 'now' : ''}>{s.label}</li>
                    ))}
                  </ol>
                )}
                <ul className="lines">
                  {o.items.map((it, k) => (
                    <li key={k}><span>{it.qty} × {it.name}</span><span>{baht(it.qty * it.unit_price)}</span></li>
                  ))}
                </ul>
                {o.note && <p className="muted small">หมายเหตุ: {o.note}</p>}
              </article>
            )
          })}

          {session && session.orders.length > 0 && session.status === 'open' && (
            askBill ? (
              <div className="card confirm">
                <p>เช็คบิล {baht(session.total)} ใช่ไหม หลังเช็คบิลจะสั่งเพิ่มไม่ได้</p>
                <div className="row">
                  <button className="btn ghost" onClick={() => setAskBill(false)}>ยังก่อน</button>
                  <button className="btn primary" onClick={() => requestService('bill', 'เช็คบิล')}>เช็คบิลเลย</button>
                </div>
              </div>
            ) : (
              <button className="btn ghost wide" onClick={() => setAskBill(true)}>ขอเช็คบิล</button>
            )
          )}
        </main>
      )}

      {cartCount > 0 && tab === 'menu' && !cartOpen && (
        <button className="cartbar" onClick={() => setCartOpen(true)}>
          <span className="count">{cartCount}</span>
          <span>ดูตะกร้า</span>
          <strong>{baht(cartTotal)}</strong>
        </button>
      )}

      {cartOpen && (
        <div className="sheet-backdrop" onClick={() => setCartOpen(false)}>
          <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="ตะกร้า">
            <header className="sheet-head">
              <h2 className="display with-ico"><Icon name="basket" size={26} /> ตะกร้า</h2>
              <button className="link" onClick={() => setCartOpen(false)}>ปิด</button>
            </header>
            <ul className="lines big">
              {cartLines.map((l) => (
                <li key={l.item.id}>
                  <span className="grow">{l.item.name}<br /><small className="muted">{baht(l.item.price)}</small></span>
                  <div className="stepper">
                    <button aria-label={`ลด ${l.item.name}`} onClick={() => add(l.item.id, -1)}>−</button>
                    <span>{l.qty}</span>
                    <button aria-label={`เพิ่ม ${l.item.name}`} className="plus" onClick={() => add(l.item.id, 1)}>+</button>
                  </div>
                </li>
              ))}
            </ul>
            {suggestions.length > 0 && (
              <div className="suggest">
                <p className="small"><Icon name="beer" size={18} /> <strong>รับโปรเบียร์ด้วยไหม</strong> <span className="muted">· เบียร์ขายเฉพาะผู้มีอายุ 20 ปีขึ้นไป</span></p>
                <div className="suggest-row">
                  {suggestions.map((s) => (
                    <button key={s.id} className="chip add" onClick={() => add(s.id, 1)}>+ {s.name} · {baht(s.price)}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="field">
              <span className="small muted">หมายเหตุถึงครัว</span>
              <input id="order-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ไม่เอาตับ น้ำจิ้มไม่เผ็ด" />
            </label>
            <button className="btn primary wide" disabled={busy || session?.status !== 'open'} onClick={placeOrder}>
              {busy ? 'กำลังส่ง…' : `สั่งเลย · ${baht(cartTotal)}`}
            </button>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
