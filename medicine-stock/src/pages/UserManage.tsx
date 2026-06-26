import { AlertTriangle, Pencil, Shield, ShieldOff, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import FormInput from '../components/FormInput'
import PageLayout from '../components/PageLayout'
import Table from '../components/Table'
import { supabase } from '../lib/supabase'
import { PAGE_PERMISSIONS, type UserProfile } from '../types'

type PageProps = {
    onLogout: () => void
    onSwitchLocation: () => void
}

const ALL_PATHS = PAGE_PERMISSIONS.map((p) => p.path)

function UserManage({ onLogout, onSwitchLocation }: PageProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [fullname, setFullname] = useState('')
    const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user')
    const [newUserPages, setNewUserPages] = useState<string[]>([...ALL_PATHS])
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState<'ok' | 'error'>('ok')
    const [users, setUsers] = useState<UserProfile[]>([])
    const [columnMissing, setColumnMissing] = useState(false)
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
    const [editPages, setEditPages] = useState<string[]>([])

    useEffect(() => {
        void loadUsers()
    }, [])

    async function loadUsers() {
        const { data, error } = await supabase
            .from('user_profile')
            .select('id, username, password_hash, fullname, role, s_active, allowed_pages')
            .order('username')

        if (error) {
            // If column doesn't exist, try without it
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
        setMessage(text)
        setMessageType(type)
    }

    async function handleAddUser() {
        showMsg('')

        if (!username.trim() || !password || !fullname.trim()) {
            showMsg('Username, password, and full name are required.', 'error')
            return
        }

        const insertPayload: Record<string, unknown> = {
            username: username.trim(),
            password_hash: password,
            fullname: fullname.trim(),
            role: newUserRole,
            s_active: true,
        }

        if (!columnMissing) {
            insertPayload.allowed_pages = newUserPages
        }

        const { data, error } = await supabase
            .from('user_profile')
            .insert([insertPayload])
            .select('id, username, password_hash, fullname, role, s_active, allowed_pages')
            .single()

        if (error) {
            showMsg('Add user failed: ' + error.message, 'error')
            return
        }

        setUsers((current) => [...current, data as UserProfile])
        showMsg('User added successfully.')
        setUsername('')
        setPassword('')
        setFullname('')
        setNewUserRole('user')
        setNewUserPages([...ALL_PATHS])
    }

    function openEdit(user: UserProfile) {
        setEditingUser(user)
        setEditPages(user.allowed_pages ?? [...ALL_PATHS])
    }

    async function handleSaveEdit() {
        if (!editingUser) return

        const { error } = await supabase
            .from('user_profile')
            .update({ allowed_pages: editPages })
            .eq('id', editingUser.id!)

        if (error) {
            showMsg('Update failed: ' + error.message, 'error')
            return
        }

        setUsers((current) =>
            current.map((u) =>
                u.id === editingUser.id ? { ...u, allowed_pages: editPages } : u,
            ),
        )
        setEditingUser(null)
        showMsg('Permissions updated.')
    }

    async function handleToggleActive(user: UserProfile) {
        const next = !user.s_active
        const { error } = await supabase
            .from('user_profile')
            .update({ s_active: next })
            .eq('id', user.id!)
        if (error) return
        setUsers((current) =>
            current.map((u) => (u.id === user.id ? { ...u, s_active: next } : u)),
        )
    }

    async function handleDeleteUser(user: UserProfile) {
        if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return

        const { error } = await supabase
            .from('user_profile')
            .delete()
            .eq('id', user.id!)

        if (error) {
            showMsg('Delete failed: ' + error.message, 'error')
            return
        }

        setUsers((current) => current.filter((u) => u.id !== user.id))
        showMsg(`User "${user.username}" deleted.`)
    }

    return (
        <PageLayout
            title="User Management"
            subtitle="Create accounts and set page-level access permissions."
            onLogout={onLogout}
            onSwitchLocation={onSwitchLocation}
        >
            {/* ⚠️ Migration warning */}
            {columnMissing && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                    <div>
                        <div className="font-semibold text-amber-800">Permission column not found</div>
                        <p className="mt-1 text-sm text-amber-700">
                            Page-level access control is disabled. Run this SQL in Supabase to enable it:
                        </p>
                        <code className="mt-2 block rounded-md bg-amber-100 px-3 py-2 text-xs font-mono text-amber-900">
                            ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS allowed_pages text[] DEFAULT NULL;
                        </code>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
                {/* Add User Form */}
                <Card className="p-5">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                            <UserPlus className="size-5" />
                        </div>
                        <h2 className="font-semibold text-slate-900">Add New User</h2>
                    </div>

                    <div className="space-y-4">
                        <FormInput label="Username" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        <FormInput label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <FormInput label="Full Name" placeholder="Full name" value={fullname} onChange={(e) => setFullname(e.target.value)} />

                        {/* Role */}
                        <div>
                            <div className="mb-2 text-sm font-medium text-slate-700">Role</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setNewUserRole('user'); setNewUserPages([...ALL_PATHS]) }}
                                    className={`rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition ${
                                        newUserRole === 'user'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                >
                                    User
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setNewUserRole('admin'); setNewUserPages([...ALL_PATHS]) }}
                                    className={`rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition ${
                                        newUserRole === 'admin'
                                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                >
                                    Admin
                                </button>
                            </div>
                            {newUserRole === 'admin' && (
                                <p className="mt-1.5 text-xs text-amber-600">
                                    Admin has full access to all pages including User Management.
                                </p>
                            )}
                        </div>

                        {/* Page Permissions — only for regular users */}
                        {newUserRole === 'user' && <div className={`rounded-xl border-2 p-4 ${columnMissing ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50'}`}>
                            <div className="mb-3 flex items-center gap-2">
                                <Shield className={`size-4 ${columnMissing ? 'text-amber-500' : 'text-blue-600'}`} />
                                <span className="text-sm font-bold text-slate-800">Page Access Permissions</span>
                                {columnMissing && (
                                    <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                        SQL required
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2.5">
                                {PAGE_PERMISSIONS.map((page) => (
                                    <label key={page.path} className="flex cursor-pointer items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={newUserPages.includes(page.path)}
                                            onChange={() => togglePage(page.path, newUserPages, setNewUserPages)}
                                            disabled={columnMissing}
                                            className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700">{page.label}</span>
                                    </label>
                                ))}
                            </div>

                            <p className="mt-3 text-xs text-slate-500">
                                Dashboard is always accessible to everyone.
                                User Management requires admin role.
                            </p>
                        </div>}

                        <button
                            type="button"
                            onClick={() => void handleAddUser()}
                            className="h-11 w-full rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                            Add User
                        </button>

                        {message && (
                            <div className={`rounded-md px-4 py-3 text-sm ${messageType === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </Card>

                {/* User List */}
                <Card className="p-5">
                    <h2 className="mb-4 text-lg font-semibold text-slate-900">
                        Users ({users.length})
                    </h2>
                    {users.length === 0 ? (
                        <EmptyState title="No users found" />
                    ) : (
                        <Table>
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">User</th>
                                    <th className="px-4 py-3 text-left font-semibold">Page Access</th>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((user) => {
                                    const pages = user.allowed_pages ?? ALL_PATHS
                                    const labels = PAGE_PERMISSIONS.filter((p) => pages.includes(p.path)).map((p) => p.label)
                                    const hasAllAccess = labels.length === PAGE_PERMISSIONS.length

                                    return (
                                        <tr key={user.id ?? user.username}>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900">{user.username}</div>
                                                <div className="text-xs text-slate-500">{user.fullname || '-'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {columnMissing ? (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                                        <ShieldOff className="size-3" />
                                                        Not configured
                                                    </span>
                                                ) : hasAllAccess ? (
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Shield className="size-3 text-emerald-500" />
                                                        All pages
                                                    </span>
                                                ) : labels.length === 0 ? (
                                                    <span className="flex items-center gap-1 text-xs text-red-500">
                                                        <ShieldOff className="size-3" />
                                                        No access
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {labels.map((label) => (
                                                            <span key={label} className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                                                                {label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleToggleActive(user)}
                                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                                        user.s_active
                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {user.s_active ? 'Active' : 'Disabled'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(user)}
                                                        disabled={columnMissing}
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <Pencil className="size-3" />
                                                        Permissions
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDeleteUser(user)}
                                                        className="inline-flex items-center justify-center rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                                    >
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

            {/* Edit Permissions Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
                    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Edit Permissions</h3>
                                <p className="text-sm text-slate-500">{editingUser.fullname || editingUser.username}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 p-4">
                            {PAGE_PERMISSIONS.map((page) => (
                                <label key={page.path} className="flex cursor-pointer items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={editPages.includes(page.path)}
                                        onChange={() => togglePage(page.path, editPages, setEditPages)}
                                        className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">{page.label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="mt-2 text-xs text-slate-400">
                            {editPages.length} of {PAGE_PERMISSIONS.length} pages selected
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSaveEdit()}
                                className="flex-1 rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

export default UserManage
