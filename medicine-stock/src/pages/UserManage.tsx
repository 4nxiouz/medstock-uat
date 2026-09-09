import { AlertTriangle, KeyRound, Pencil, Shield, ShieldOff, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import FormInput from '../components/FormInput'
import PageLayout from '../components/PageLayout'
import Table from '../components/Table'
import { hashPassword } from '../lib/crypto'
import { supabase } from '../lib/supabase'
import { PAGE_PERMISSIONS, type UserProfile } from '../types'

type PageProps = { onLogout: () => void }
type Role = 'user' | 'supervisor' | 'admin'

const ALL_PATHS = ['/', ...PAGE_PERMISSIONS.map((p) => p.path)]

const ROLE_STYLES: Record<Role, string> = {
    user: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    supervisor: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    admin: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

const ROLE_LABELS: Record<Role, string> = {
    user: 'User',
    supervisor: 'Supervisor',
    admin: 'Admin',
}

const BAG_LOG_SUBS = [
    { path: '/bag-report/edit', label: 'Edit Info' },
    { path: '/bag-report/log', label: 'Incident Report' },
]

function RoleBadge({ role }: { role: string }) {
    const r = (role || 'user') as Role
    return (
        <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-bold ${ROLE_STYLES[r] ?? 'bg-slate-100 text-slate-500'}`}>
            {ROLE_LABELS[r] ?? role}
        </span>
    )
}

function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
    return (
        <div className="grid grid-cols-3 gap-2">
            {(['user', 'supervisor', 'admin'] as Role[]).map((r) => (
                <button key={r} type="button" onClick={() => onChange(r)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                        value === r
                            ? r === 'user' ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : r === 'supervisor' ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    {ROLE_LABELS[r]}
                </button>
            ))}
        </div>
    )
}

function PagePermissions({
    role, pages, onToggle,
}: {
    role: Role
    pages: string[]
    onToggle: (path: string) => void
}) {
    if (role === 'admin') {
        return (
            <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 font-medium">
                Admin มีสิทธิ์เข้าถึงทุกหน้าโดยอัตโนมัติ รวมถึง User Management
            </p>
        )
    }

    const borderColor = role === 'supervisor' ? 'border-blue-100' : 'border-blue-100'
    const bgColor = role === 'supervisor' ? 'bg-blue-50/50' : 'bg-teal-50'
    const checkColor = role === 'supervisor' ? 'text-blue-600 focus:ring-blue-500' : 'text-teal-700 focus:ring-teal-500'

    return (
        <div className={`rounded-xl border-2 p-4 ${borderColor} ${bgColor}`}>
            <div className="mb-3 flex items-center gap-2">
                <Shield className={`size-4 ${role === 'supervisor' ? 'text-blue-600' : 'text-teal-700'}`} />
                <span className="text-sm font-bold text-slate-800">Page Access</span>
                {role === 'supervisor' && (
                    <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        ดูได้เท่านั้น ยกเว้น Incident Report
                    </span>
                )}
            </div>
            <div className="space-y-2.5">
                {PAGE_PERMISSIONS.map((page) => (
                    <div key={page.path}>
                        <label className="flex cursor-pointer items-center gap-3">
                            <input type="checkbox" checked={pages.includes(page.path)}
                                onChange={() => onToggle(page.path)}
                                className={`size-4 rounded border-slate-300 ${checkColor}`} />
                            <span className="text-sm text-slate-700">{page.label}</span>
                        </label>
                        {page.path === '/bag-report' && pages.includes('/bag-report') && (
                            <div className="ml-7 mt-2 space-y-1.5 border-l-2 border-blue-200 pl-3">
                                {BAG_LOG_SUBS.map((sub) => {
                                    const isIncidentReport = sub.path === '/bag-report/log'
                                    const lockedForSupervisor = role === 'supervisor' && isIncidentReport
                                    return (
                                        <label key={sub.path} className={`flex items-center gap-3 ${lockedForSupervisor ? 'cursor-default' : 'cursor-pointer'}`}>
                                            <input type="checkbox"
                                                checked={lockedForSupervisor ? true : pages.includes(sub.path)}
                                                onChange={() => !lockedForSupervisor && onToggle(sub.path)}
                                                disabled={lockedForSupervisor}
                                                className={`size-3.5 rounded border-slate-300 ${checkColor} disabled:opacity-100`} />
                                            <span className="text-xs text-slate-600">{sub.label}</span>
                                            {lockedForSupervisor && (
                                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 uppercase tracking-wide">required</span>
                                            )}
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function UserManage({ onLogout }: PageProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [fullname, setFullname] = useState('')
    const [newUserRole, setNewUserRole] = useState<Role>('user')
    const [newUserPages, setNewUserPages] = useState<string[]>([...ALL_PATHS])
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState<'ok' | 'error'>('ok')
    const [users, setUsers] = useState<UserProfile[]>([])
    const [columnMissing, setColumnMissing] = useState(false)
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
    const [editRole, setEditRole] = useState<Role>('user')
    const [editPages, setEditPages] = useState<string[]>([])
    const [resetUser, setResetUser] = useState<UserProfile | null>(null)
    const [newPassword, setNewPassword] = useState('')

    useEffect(() => { void loadUsers() }, [])

    async function loadUsers() {
        const { data, error } = await supabase
            .from('user_profile')
            .select('id, username, password_hash, fullname, role, s_active, allowed_pages')
            .order('username')

        if (error) {
            if (error.message.includes('allowed_pages')) {
                setColumnMissing(true)
                const { data: fallback } = await supabase
                    .from('user_profile')
                    .select('id, username, password_hash, fullname, role, s_active')
                    .order('username')
                setUsers((fallback || []) as UserProfile[])
            }
            return
        }
        setUsers((data || []) as UserProfile[])
    }

    function togglePage(path: string, pages: string[], setPages: (v: string[]) => void) {
        setPages(pages.includes(path) ? pages.filter((p) => p !== path) : [...pages, path])
    }

    function showMsg(text: string, type: 'ok' | 'error' = 'ok') {
        setMessage(text); setMessageType(type)
    }

    function ensureSupervisorPages(pages: string[]): string[] {
        // Supervisor always has Incident Report access
        const result = [...pages]
        if (!result.includes('/bag-report')) result.push('/bag-report')
        if (!result.includes('/bag-report/log')) result.push('/bag-report/log')
        return result
    }

    function handleNewRoleChange(role: Role) {
        setNewUserRole(role)
        if (role === 'supervisor') setNewUserPages(ensureSupervisorPages(['/bag-report']))
        else if (role === 'admin') setNewUserPages([...ALL_PATHS])
        else setNewUserPages([...ALL_PATHS])
    }

    async function handleAddUser() {
        showMsg('')
        if (!username.trim() || !password || !fullname.trim()) {
            showMsg('Username, password, and full name are required.', 'error'); return
        }
        const insertPayload: Record<string, unknown> = {
            username: username.trim(),
            password_hash: await hashPassword(password),
            fullname: fullname.trim(),
            role: newUserRole,
            s_active: true,
        }
        if (!columnMissing) {
            insertPayload.allowed_pages = newUserRole === 'supervisor'
                ? ensureSupervisorPages(newUserPages)
                : newUserPages
        }

        const { data, error } = await supabase.from('user_profile')
            .insert([insertPayload])
            .select('id, username, password_hash, fullname, role, s_active, allowed_pages')
            .single()

        if (error) { showMsg('Add user failed: ' + error.message, 'error'); return }

        const newUserId = (data as UserProfile).id
        const { data: locs, error: locErr } = await supabase.from('location').select('id').eq('s_active', true).limit(1)
        if (locErr) { showMsg('User created but location fetch failed: ' + locErr.message, 'error'); return }
        if (!locs || locs.length === 0) { showMsg('User created but no active location found.', 'error'); return }
        const { error: assignErr } = await supabase.from('user_location').insert([{ user_id: newUserId, location_id: locs[0].id }])
        if (assignErr) { showMsg('User created but location assign failed: ' + assignErr.message, 'error'); return }

        setUsers((cur) => [...cur, data as UserProfile])
        showMsg('User added successfully.')
        setUsername(''); setPassword(''); setFullname('')
        setNewUserRole('user'); setNewUserPages([...ALL_PATHS])
    }

    function openEdit(user: UserProfile) {
        setEditingUser(user)
        setEditRole((user.role as Role) || 'user')
        setEditPages(user.allowed_pages ?? [...ALL_PATHS])
    }

    async function handleSaveEdit() {
        if (!editingUser) return

        const updatePayload: Record<string, unknown> = { role: editRole }
        if (!columnMissing) {
            updatePayload.allowed_pages = editRole === 'supervisor'
                ? ensureSupervisorPages(editPages)
                : editPages
        }

        const { error } = await supabase.from('user_profile')
            .update(updatePayload)
            .eq('id', editingUser.id!)

        if (error) { showMsg('Update failed: ' + error.message, 'error'); return }

        setUsers((cur) => cur.map((u) =>
            u.id === editingUser.id ? { ...u, role: editRole, allowed_pages: editPages } : u
        ))
        setEditingUser(null)
        showMsg(`Updated "${editingUser.username}" — Role: ${ROLE_LABELS[editRole]}`)
    }

    async function handleToggleActive(user: UserProfile) {
        const next = !user.s_active
        const { error } = await supabase.from('user_profile').update({ s_active: next }).eq('id', user.id!)
        if (error) return
        setUsers((cur) => cur.map((u) => (u.id === user.id ? { ...u, s_active: next } : u)))
    }

    async function handleDeleteUser(user: UserProfile) {
        if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return
        const { error } = await supabase.from('user_profile').delete().eq('id', user.id!)
        if (error) { showMsg('Delete failed: ' + error.message, 'error'); return }
        setUsers((cur) => cur.filter((u) => u.id !== user.id))
        showMsg(`User "${user.username}" deleted.`)
    }

    async function handleResetPassword() {
        if (!resetUser || !newPassword.trim()) return
        const { error } = await supabase.from('user_profile')
            .update({ password_hash: await hashPassword(newPassword.trim()) })
            .eq('id', resetUser.id!)
        if (error) { showMsg('Reset failed: ' + error.message, 'error'); return }
        setResetUser(null); setNewPassword('')
        showMsg(`Password reset for "${resetUser.username}".`)
    }

    return (
        <PageLayout title="User Management" subtitle="Create accounts and set page-level access permissions." onLogout={onLogout}>
            {columnMissing && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                    <div>
                        <div className="font-semibold text-amber-800">Permission column not found</div>
                        <p className="mt-1 text-sm text-amber-700">Run this SQL in Supabase to enable page-level access:</p>
                        <code className="mt-2 block rounded-md bg-amber-100 px-3 py-2 text-xs font-mono text-amber-900">
                            ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS allowed_pages text[] DEFAULT NULL;
                        </code>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                {/* ── Add User Form ── */}
                <Card className="p-5">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                            <UserPlus className="size-5" />
                        </div>
                        <h2 className="font-semibold text-slate-900">Add New User</h2>
                    </div>
                    <div className="space-y-4">
                        <FormInput label="Username" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        <FormInput label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <FormInput label="Full Name" placeholder="Full name" value={fullname} onChange={(e) => setFullname(e.target.value)} />

                        <div>
                            <div className="mb-2 text-sm font-medium text-slate-700">Role</div>
                            <RolePicker value={newUserRole} onChange={handleNewRoleChange} />
                        </div>

                        <PagePermissions
                            role={newUserRole}
                            pages={newUserPages}
                            onToggle={(path) => togglePage(path, newUserPages, setNewUserPages)}
                        />

                        <button type="button" onClick={() => void handleAddUser()}
                            className="h-11 w-full rounded-lg bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800">
                            Add User
                        </button>

                        {message && (
                            <div className={`rounded-md px-4 py-3 text-sm ${messageType === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </Card>

                {/* ── User List ── */}
                <Card className="overflow-hidden p-0">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">Users ({users.length})</h2>
                    </div>
                    {users.length === 0 ? (
                        <div className="p-5"><EmptyState title="No users found" /></div>
                    ) : (
                        <Table>
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">User</th>
                                    <th className="px-4 py-3 text-left font-semibold">Role</th>
                                    <th className="px-4 py-3 text-left font-semibold">หน้าที่เข้าถึงได้</th>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 animate-rows">
                                {users.map((user) => {
                                    const role = (user.role || 'user') as Role
                                    const pages = user.allowed_pages ?? ALL_PATHS
                                    const visiblePages = PAGE_PERMISSIONS.filter((p) => pages.includes(p.path))
                                    const isAdmin = role === 'admin'
                                    const isSupervisor = role === 'supervisor'

                                    return (
                                        <tr key={user.id ?? user.username} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900">{user.username}</div>
                                                <div className="text-xs text-slate-500">{user.fullname || '—'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <RoleBadge role={role} />
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                {columnMissing ? (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                                        <ShieldOff className="size-3" />Not configured
                                                    </span>
                                                ) : isAdmin ? (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                                        <Shield className="size-3" />All pages (Admin)
                                                    </span>
                                                ) : isSupervisor ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {visiblePages.map((p) => (
                                                            <span key={p.path} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">{p.label}</span>
                                                        ))}
                                                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">↳ Incident Report ✓</span>
                                                    </div>
                                                ) : visiblePages.length === 0 ? (
                                                    <span className="flex items-center gap-1 text-xs text-red-500">
                                                        <ShieldOff className="size-3" />No access
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {visiblePages.map((p) => (
                                                            <span key={p.path} className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">{p.label}</span>
                                                        ))}
                                                        {BAG_LOG_SUBS.filter((s) => pages.includes(s.path)).map((s) => (
                                                            <span key={s.path} className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-600">↳ {s.label}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button type="button" onClick={() => void handleToggleActive(user)}
                                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                                        user.s_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}>
                                                    {user.s_active ? 'Active' : 'Disabled'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => openEdit(user)}
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                                        <Pencil className="size-3" />Edit
                                                    </button>
                                                    <button type="button" onClick={() => { setResetUser(user); setNewPassword('') }}
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">
                                                        <KeyRound className="size-3" />
                                                    </button>
                                                    <button type="button" onClick={() => void handleDeleteUser(user)}
                                                        className="inline-flex items-center justify-center rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </Table>
                    )}
                </Card>
            </div>

            {/* ── Edit User Modal ── */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
                            <div>
                                <h3 className="font-semibold text-slate-900">Edit User</h3>
                                <p className="text-sm text-slate-500">{editingUser.fullname || editingUser.username}</p>
                            </div>
                            <button type="button" onClick={() => setEditingUser(null)}
                                className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div>
                                <div className="mb-2 text-sm font-medium text-slate-700">Role</div>
                                <RolePicker value={editRole} onChange={(r) => {
                                    setEditRole(r)
                                    if (r === 'supervisor') setEditPages(ensureSupervisorPages(['/bag-report']))
                                    else setEditPages([...ALL_PATHS])
                                }} />
                            </div>

                            <PagePermissions
                                role={editRole}
                                pages={editPages}
                                onToggle={(path) => togglePage(path, editPages, setEditPages)}
                            />
                        </div>

                        <div className="flex gap-2 border-t border-slate-100 p-4 shrink-0">
                            <button type="button" onClick={() => setEditingUser(null)}
                                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button type="button" onClick={() => void handleSaveEdit()}
                                className="flex-1 rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reset Password Modal ── */}
            {resetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl max-h-[calc(100vh-3rem)] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Reset Password</h3>
                                <p className="text-sm text-slate-500">{resetUser.fullname || resetUser.username}</p>
                            </div>
                            <button type="button" onClick={() => setResetUser(null)}
                                className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
                                <X className="size-4" />
                            </button>
                        </div>
                        <FormInput label="New Password" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => setResetUser(null)}
                                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={() => void handleResetPassword()} disabled={!newPassword.trim()}
                                className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-300">Reset Password</button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

export default UserManage
