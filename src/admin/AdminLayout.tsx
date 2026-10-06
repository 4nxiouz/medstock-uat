import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase, toLoginEmail, toUsername } from '../lib/supabase'
import { BrandMark, Lights, Logo } from '../components/Brand'
import { Icon, type IconName } from '../components/Icons'
import { useStaff } from './useStaff'
import ChangePassword from './ChangePassword'
import './admin.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(username), password })
    if (error) setErr(error.message === 'Invalid login credentials' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : error.message)
    setBusy(false)
  }

  return (
    <div className="a-login">
      <Lights />
      <form className="a-login-card" onSubmit={submit}>
        <div className="a-login-logo"><Logo size={72} /></div>
        <p className="a-eyebrow">หลังร้าน · หมูกะทะริมน้ำ</p>
        <h1>ยินดีต้อนรับกลับมา</h1>
        <label className="a-field"><span>ชื่อผู้ใช้</span>
          <input id="username" required value={username} onChange={(e) => setUsername(e.target.value)}
            autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="เช่น admin" autoFocus />
        </label>
        <label className="a-field"><span>รหัสผ่าน</span>
          <div className="a-pw">
            <input id="password" type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="button" className="a-pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}><Icon name={show ? 'eyeOff' : 'eye'} size={18} /></button>
          </div>
        </label>
        {err && <p className="a-error">{err}</p>}
        <button className="a-btn primary big" disabled={busy}>{busy ? 'รอสักครู่…' : <>เข้าสู่ระบบ <Icon name="flame" size={18} /></>}</button>
        <p className="a-muted small">บัญชีพนักงานสร้างโดยเจ้าของร้านในหน้า ตั้งค่า เท่านั้น</p>
      </form>
    </div>
  )
}

function NoAccess() {
  const { session, reload } = useStaff()
  return (
    <div className="a-login">
      <Lights />
      <div className="a-login-card">
        <p className="a-eyebrow">{toUsername(session?.user.email)}</p>
        <h1>บัญชีนี้ยังไม่มีสิทธิ์</h1>
        <p className="a-muted">ให้เจ้าของร้านเพิ่มบัญชีนี้ในหน้า ตั้งค่า → พนักงาน แล้วกดลองอีกครั้ง</p>
        <button className="a-btn primary" onClick={reload}>ลองอีกครั้ง</button>
        <button className="a-link" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { session, staff, loading, isOwner } = useStaff()
  const [pwOpen, setPwOpen] = useState(false)
  if (loading) return <div className="a-login"><p className="a-login-loading">กำลังจุดเตา…</p></div>
  if (!session) return <Login />
  if (!staff) return <NoAccess />

  const tabs: { to: string; icon: IconName; label: string }[] = [
    { to: '/admin/tables', icon: 'table', label: 'โต๊ะ' },
    { to: '/admin/kitchen', icon: 'flame', label: 'ครัว' },
    { to: '/admin/menu', icon: 'menu', label: 'เมนู' },
    ...(isOwner ? [{ to: '/admin/report', icon: 'chart' as IconName, label: 'สรุปยอด' }] : []),
    { to: '/admin/settings', icon: 'gear', label: 'ตั้งค่า' },
  ]
  const name = staff.display_name || toUsername(session.user.email)

  return (
    <div className="a-shell">
      <header className="a-top">
        <Lights />
        <div className="a-top-row">
          <BrandMark sub="หลังร้าน" />
          <nav className="a-nav">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} className={({ isActive }) => isActive ? 'on' : ''}>
                <Icon name={t.icon} size={18} /> {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="a-user">
            <span className="a-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
            <span className="a-user-name">{name}<small>{isOwner ? 'เจ้าของร้าน' : 'พนักงาน'}</small></span>
            <button className="a-top-btn" onClick={() => setPwOpen(true)}><Icon name="key" size={16} /> <span>เปลี่ยนรหัส</span></button>
            <button className="a-top-btn" onClick={() => supabase.auth.signOut()} aria-label="ออกจากระบบ"><Icon name="logout" size={16} /> <span>ออก</span></button>
          </div>
        </div>
      </header>
      <main className="a-main"><Outlet /></main>
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
    </div>
  )
}
