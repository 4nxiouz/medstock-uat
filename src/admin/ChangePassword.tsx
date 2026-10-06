import { useState } from 'react'
import { supabase, errText } from '../lib/supabase'
import { useStaff } from './useStaff'
import { Modal } from './common'

/** Change own password: re-checks the current one first, then updates. */
export default function ChangePassword({ onClose }: { onClose: () => void }) {
  const { session } = useStaff()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (next.length < 6) { setErr('รหัสใหม่ต้องยาวอย่างน้อย 6 ตัว'); return }
    if (next !== confirm) { setErr('รหัสใหม่ทั้งสองช่องไม่ตรงกัน'); return }
    if (next === current) { setErr('รหัสใหม่ต้องไม่ซ้ำกับรหัสเดิม'); return }
    const email = session?.user.email
    if (!email) return
    setBusy(true)
    const check = await supabase.auth.signInWithPassword({ email, password: current })
    if (check.error) { setBusy(false); setErr('รหัสผ่านปัจจุบันไม่ถูกต้อง'); return }
    const { error } = await supabase.auth.updateUser({ password: next })
    setBusy(false)
    if (error) { setErr(errText(error)); return }
    setDone(true)
  }

  return (
    <Modal title="เปลี่ยนรหัสผ่าน" onClose={onClose}>
      {done ? (
        <div className="a-form">
          <p className="a-ok">เปลี่ยนรหัสผ่านเรียบร้อย ครั้งหน้าใช้รหัสใหม่เข้าสู่ระบบ</p>
          <button className="a-btn primary" onClick={onClose}>ตกลง</button>
        </div>
      ) : (
        <form className="a-form" onSubmit={submit}>
          <label className="a-field"><span>รหัสผ่านปัจจุบัน</span>
            <input id="pw-current" type={show ? 'text' : 'password'} required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </label>
          <label className="a-field"><span>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</span>
            <input id="pw-new" type={show ? 'text' : 'password'} required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </label>
          <label className="a-field"><span>ยืนยันรหัสผ่านใหม่</span>
            <input id="pw-confirm" type={show ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>
          <label className="a-check small"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> แสดงรหัสผ่าน</label>
          {err && <p className="a-error">{err}</p>}
          <button className="a-btn primary" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกรหัสใหม่'}</button>
        </form>
      )}
    </Modal>
  )
}
