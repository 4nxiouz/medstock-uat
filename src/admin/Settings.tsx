import { useCallback, useEffect, useState } from 'react'
import { supabase, errText, toUsername } from '../lib/supabase'
import { isValidPromptPay } from '../lib/promptpay'
import { useStaff } from './useStaff'
import { QR, Modal } from './common'
import ChangePassword from './ChangePassword'
import { Icon } from '../components/Icons'

type StaffRow = { user_id: string; email: string; username?: string; display_name: string; role: 'owner' | 'staff' }
type T = { id: number; name: string; seats: number; qr_code: string; is_active: boolean; sort_order: number }

export default function Settings() {
  const { isOwner, session, staff } = useStaff()
  const [shopName, setShopName] = useState('')
  const [pp, setPp] = useState('')
  const [staffRows, setStaffRows] = useState<StaffRow[]>([])
  const [tables, setTables] = useState<T[]>([])
  const [newUser, setNewUser] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newName, setNewName] = useState('')
  const [pwOpen, setPwOpen] = useState(false)
  const [resetFor, setResetFor] = useState<StaffRow | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [newRole, setNewRole] = useState<'staff' | 'owner'>('staff')
  const [newTable, setNewTable] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [printing, setPrinting] = useState(false)

  const load = useCallback(async () => {
    const [s, st, t] = await Promise.all([
      supabase.from('shop_settings').select('shop_name,promptpay_id').maybeSingle(),
      supabase.rpc('list_staff'),
      supabase.from('dining_tables').select('id,name,seats,qr_code,is_active,sort_order').order('sort_order'),
    ])
    if (s.data) { setShopName(s.data.shop_name); setPp(s.data.promptpay_id) }
    if (st.data) setStaffRows(st.data as StaffRow[])
    if (t.data) setTables(t.data)
  }, [])
  useEffect(() => { load() }, [load])

  const flash = (m: string) => { setMsg(m); setErr(''); setTimeout(() => setMsg(''), 2500) }

  const saveShop = async () => {
    if (pp && !isValidPromptPay(pp)) { setErr('เลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก'); return }
    const { error } = await supabase.from('shop_settings').update({ shop_name: shopName, promptpay_id: pp.replace(/\D/g, ''), updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) setErr(errText(error)); else flash('บันทึกข้อมูลร้านแล้ว')
  }

  const addStaff = async () => {
    if (!newUser.trim() || newPw.length < 6) { setErr('ใส่ชื่อผู้ใช้ และรหัสผ่านอย่างน้อย 6 ตัว'); return }
    const { error } = await supabase.rpc('create_staff_account', { p_username: newUser.trim().toLowerCase(), p_password: newPw, p_role: newRole, p_name: newName.trim() })
    if (error) { setErr(errText(error)); return }
    setNewUser(''); setNewPw(''); setNewName(''); flash(`สร้างบัญชี ${newUser.trim().toLowerCase()} แล้ว`); load()
  }
  const doResetPw = async () => {
    if (!resetFor) return
    if (resetPw.length < 6) { setErr('รหัสผ่านต้องยาวอย่างน้อย 6 ตัว'); return }
    const { error } = await supabase.rpc('reset_staff_password', { p_user_id: resetFor.user_id, p_password: resetPw })
    if (error) { setErr(errText(error)); return }
    flash(`ตั้งรหัสใหม่ให้ ${resetFor.username || toUsername(resetFor.email)} แล้ว`); setResetFor(null); setResetPw('')
  }
  const removeStaff = async (id: string) => {
    const { error } = await supabase.from('staff').delete().eq('user_id', id)
    if (error) setErr(errText(error)); else load()
  }

  const updTable = async (t: T, patch: Partial<T>) => {
    setTables((xs) => xs.map((x) => (x.id === t.id ? { ...x, ...patch } : x)))
    const { error } = await supabase.from('dining_tables').update(patch).eq('id', t.id)
    if (error) { setErr(errText(error)); load() }
  }
  const addTable = async () => {
    if (!newTable.trim()) return
    const { error } = await supabase.from('dining_tables').insert({ name: newTable.trim(), sort_order: tables.length + 1 })
    if (error) setErr(errText(error)); else { setNewTable(''); load() }
  }

  const tableUrl = (t: T) => `${window.location.origin}/t/${t.qr_code}`

  useEffect(() => {
    if (!printing) return
    const t = window.setTimeout(() => { window.print(); setPrinting(false) }, 400)
    return () => window.clearTimeout(t)
  }, [printing])

  return (
    <div className="a-page">
      <div className="a-page-head">
        <h1 className="with-ico"><Icon name="gear" size={26} /> ตั้งค่า</h1>
        <button className="a-btn sm ghost" onClick={() => supabase.auth.signOut()}>ออกจากระบบ ({toUsername(session?.user.email)})</button>
      </div>
      {msg && <p className="a-ok">{msg}</p>}
      {err && <p className="a-error">{err}</p>}

      <section className="a-section">
        <h2 className="with-ico"><Icon name="user" size={22} /> บัญชีของฉัน</h2>
        <div className="a-card a-me">
          <span className="a-avatar lg" aria-hidden="true">{(staff?.display_name || toUsername(session?.user.email)).slice(0, 1).toUpperCase()}</span>
          <div className="grow">
            <strong>{toUsername(session?.user.email)}</strong>
            <p className="a-muted small">{isOwner ? 'เจ้าของร้าน' : 'พนักงาน'}{staff?.display_name ? ` · ${staff.display_name}` : ''}</p>
          </div>
          <button className="a-btn primary" onClick={() => setPwOpen(true)}><Icon name="key" size={18} /> เปลี่ยนรหัสผ่าน</button>
        </div>
      </section>

      <section className="a-section">
        <h2 className="with-ico"><Icon name="lantern" size={22} /> ร้าน</h2>
        <div className="a-grid2">
          <label className="a-field"><span>ชื่อร้าน</span><input id="shop-name" value={shopName} disabled={!isOwner} onChange={(e) => setShopName(e.target.value)} /></label>
          <label className="a-field"><span>พร้อมเพย์ (เบอร์มือถือหรือเลขบัตร)</span><input id="promptpay" inputMode="numeric" value={pp} disabled={!isOwner} onChange={(e) => setPp(e.target.value)} placeholder="08xxxxxxxx" /></label>
        </div>
        <p className="a-muted small">ใช้สร้าง QR จ่ายเงินพร้อมยอดตอนเช็คบิล ลูกค้าสแกนแล้วยอดขึ้นเองไม่ต้องพิมพ์</p>
        {isOwner && <button className="a-btn primary" onClick={saveShop}>บันทึก</button>}
      </section>

      <section className="a-section">
        <h2 className="with-ico"><Icon name="chef" size={22} /> พนักงาน</h2>
        <ul className="a-plain">
          {staffRows.map((s) => (
            <li key={s.user_id}>
              <span>
                <strong>{s.username || toUsername(s.email)}</strong>
                {s.display_name && <span className="a-muted"> · {s.display_name}</span>}
                <span className={`a-chip ${s.role === 'owner' ? 'warn' : ''}`}>{s.role === 'owner' ? 'เจ้าของร้าน' : 'พนักงาน'}</span>
              </span>
              {isOwner && s.user_id !== staff?.user_id && (
                <span className="a-row">
                  <button className="a-link" onClick={() => { setResetFor(s); setResetPw('') }}>ตั้งรหัสใหม่</button>
                  <button className="a-link" onClick={() => removeStaff(s.user_id)}>เอาออก</button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {isOwner && (
          <>
            <p className="a-muted small">สร้างบัญชีให้พนักงานได้จากตรงนี้เลย ใช้ชื่อผู้ใช้ (a-z, 0-9) กับรหัสผ่านอย่างน้อย 6 ตัว พนักงานทั่วไปเปิดโต๊ะ ปิดบิล ใช้หน้าครัว และกดของหมดได้ แต่ไม่เห็นต้นทุนกับยอดขาย</p>
            <div className="a-row wrap">
              <input id="staff-username" className="a-input" placeholder="ชื่อผู้ใช้ เช่น mook" autoCapitalize="none" spellCheck={false} value={newUser} onChange={(e) => setNewUser(e.target.value)} />
              <input id="staff-password" className="a-input" type="text" placeholder="รหัสผ่าน" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <input id="staff-name" className="a-input" placeholder="ชื่อเล่น (ไม่ใส่ก็ได้)" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <select id="staff-role" className="a-input" value={newRole} onChange={(e) => setNewRole(e.target.value as 'staff' | 'owner')}>
                <option value="staff">พนักงาน</option><option value="owner">เจ้าของร้าน</option>
              </select>
              <button className="a-btn primary" onClick={addStaff}>สร้างบัญชี</button>
            </div>
          </>
        )}
      </section>

      <section className="a-section">
        <div className="a-page-head"><h2 className="with-ico"><Icon name="qr" size={22} /> โต๊ะและ QR</h2><button className="a-btn sm ghost" onClick={() => setPrinting(true)}>พิมพ์ QR ทุกโต๊ะ</button></div>
        <div className="a-scroll">
          <table className="a-tbl">
            <thead><tr><th>ชื่อ</th><th className="num">ที่นั่ง</th><th>ใช้งาน</th><th>ลิงก์</th></tr></thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.id} className={t.is_active ? '' : 'dim'}>
                  <td>{isOwner ? <input defaultValue={t.name} onBlur={(e) => e.target.value !== t.name && updTable(t, { name: e.target.value })} /> : t.name}</td>
                  <td className="num">{isOwner ? <input inputMode="numeric" defaultValue={t.seats} onBlur={(e) => Number(e.target.value) !== t.seats && updTable(t, { seats: Number(e.target.value) || t.seats })} /> : t.seats}</td>
                  <td><input type="checkbox" checked={t.is_active} disabled={!isOwner} onChange={(e) => updTable(t, { is_active: e.target.checked })} aria-label="ใช้งาน" /></td>
                  <td className="a-mono small">/t/{t.qr_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isOwner && (
          <div className="a-row wrap">
            <input id="new-table" className="a-input" placeholder="ชื่อโต๊ะใหม่ เช่น โต๊ะ 9" value={newTable} onChange={(e) => setNewTable(e.target.value)} />
            <button className="a-btn ghost" onClick={addTable}>เพิ่มโต๊ะ</button>
          </div>
        )}
      </section>

      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
      {resetFor && (
        <Modal title={`ตั้งรหัสใหม่ให้ ${resetFor.username || toUsername(resetFor.email)}`} onClose={() => setResetFor(null)}>
          <div className="a-form">
            <label className="a-field"><span>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</span>
              <input id="reset-pw" type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} autoFocus />
            </label>
            <p className="a-muted small">บอกรหัสนี้ให้พนักงาน แล้วให้เขาเข้าไปเปลี่ยนเองที่ปุ่ม เปลี่ยนรหัส ด้านบน</p>
            <button className="a-btn primary" onClick={doResetPw}>บันทึก</button>
          </div>
        </Modal>
      )}

      <div className={`a-print ${printing ? 'show' : ''}`} aria-hidden={!printing}>
        {tables.filter((t) => t.is_active).map((t) => (
          <div key={t.id} className="a-print-card">
            <p className="eb">{shopName}</p>
            <h3>{t.name}</h3>
            <QR value={tableUrl(t)} size={230} />
            <p className="cta">สแกนเพื่อสั่งอาหาร</p>
            <p className="steps">1. สแกน QR ด้วยกล้องมือถือ<br />2. ใส่รหัส 4 หลักที่ได้จากพนักงาน<br />3. เลือกเมนู แล้วกดสั่งได้เลย</p>
          </div>
        ))}
      </div>
    </div>
  )
}
