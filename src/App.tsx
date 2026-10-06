import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Customer from './pages/Customer'
import { BrandMark } from './components/Brand'

const AdminApp = lazy(() => import('./admin/AdminApp'))

function Home() {
  return (
    <div className="screen center">
      <div className="card narrow">
        <BrandMark sub="ร้านลับริมน้ำ" />
        <h1 className="display">สแกน QR ที่โต๊ะ แล้วสั่งได้เลย</h1>
        <ol className="home-steps">
          <li><b>1</b><span>สแกน QR บนโต๊ะด้วยกล้องมือถือ</span></li>
          <li><b>2</b><span>ใส่รหัส 4 หลักที่ได้จากพนักงาน</span></li>
          <li><b>3</b><span>เลือกเซ็ต กดสั่ง แล้วรอย่างหอม ๆ</span></li>
        </ol>
        <p className="muted small">สแกนแล้วยังเข้าไม่ได้ เรียกพนักงานได้เลย</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/t/:qr" element={<Customer />} />
      <Route path="/admin/*" element={<Suspense fallback={<div className="screen center"><p className="muted">กำลังโหลด…</p></div>}><AdminApp /></Suspense>} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
