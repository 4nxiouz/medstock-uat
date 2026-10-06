import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { StaffProvider, useStaff } from './useStaff'
import Tables from './Tables'
import Kitchen from './Kitchen'
import Menu from './Menu'
import Report from './Report'
import Settings from './Settings'

function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { isOwner } = useStaff()
  return isOwner ? <>{children}</> : <div className="a-page"><p className="a-muted">หน้านี้สำหรับเจ้าของร้าน</p></div>
}

export default function AdminApp() {
  return (
    <StaffProvider>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="tables" replace />} />
          <Route path="tables" element={<Tables />} />
          <Route path="kitchen" element={<Kitchen />} />
          <Route path="menu" element={<Menu />} />
          <Route path="report" element={<OwnerOnly><Report /></OwnerOnly>} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </StaffProvider>
  )
}
