import { Pencil, Shield, UserPlus, X } from 'lucide-react'
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
}

const ALL_PATHS = PAGE_PERMISSIONS.map((p) => p.path)

function UserManage({ onLogout }: PageProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [fullname, setFullname] = useState('')
    const [newUserPages, setNewUserPages] = useState<string[]>([...ALL_PATHS])
    const [message, setMessage] = useState('')
    const [users, setUsers] = useState<UserProfile[]>([])
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

        if (!error) {
            setUsers((data || []) as UserProfile[])
        }
    }

    function togglePage(path: string, pages: string[], setPages: (v: string[]) => void) {
        setPages(pages.includes(path) ? pages.filter((p) => p !== path) : [...pages, path])
    }

    async function handleAddUser() {
        setMessage('')

        if (!username.trim() || !password || !fullname.trim()) {
            setMessage('Username, password, and full name are required.')
            return
        }

        const { data, error } = await supabase
            .from('user_profile')
            .insert([
                {
                    username: username.trim(),
                    password_hash: password,
                    fullname: fullname.trim(),
                    role: 'user',
                    s_active: true,
                    allowed_pages: newUserPages,
                },
            ])
            .select('id, username, password_hash, fullname, role, s_active, allowed_pages')
            .single()

        if (error) {
            setMessage('Add user failed. ' + error.message)
            return
        }

        setUsers((current) => [...current, data as UserProfile])
        setMessage('User added successfully.')
        setUsername('')
        setPassword('')
        setFullname('')
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
            setMessage('Update failed. ' + error.message)
            return
        }

        setUsers((current) =>
            current.map((u) =>
                u.id === editingUser.id ? { ...u, allowed_pages: editPages } : u,
            ),
        )
        setEditingUser(null)
        setMessage('Permissions updated.')
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

    return (
        <PageLayout
            title="User Management"
            subtitle="Create accounts and set page-level access permissions."
            onLogout={onLogout}
        >
            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                {/* Add User Form */}
                <Card className="p-5">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                            <UserPlus className="size-5" />
                        </div>
                        <h2 className="font-semibold text-slate-900">Add User</h2>
                    </div>

                    <div className="space-y-4">
                        <FormInput
                            label="Username"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <FormInput
                            label="Password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <FormInput
                            label="Full Name"
                            placeholder="Full name"
                            value={fullname}
                            onChange={(e) => setFullname(e.target.value)}
                        />

                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Shield className="size-4 text-blue-500" />
                                Page Access
                            </div>
                            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                                {PAGE_PERMISSIONS.map((page) => (
                                    <label key={page.path} className="flex cursor-pointer items-center gap-2.5">
                                        <input
                                            type="checkbox"
                                            checked={newUserPages.includes(page.path)}
                                            onChange={() => togglePage(page.path, newUserPages, setNewUserPages)}
                                            className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700">{page.label}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="mt-1.5 text-xs text-slate-400">
                                Dashboard is always accessible. User Management is admin-only.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void handleAddUser()}
                            className="h-11 w-full rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                            Add User
                        </button>

                        {message && (
                            <div className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
                                {message}
                            </div>
                        )}
                    </div>
                </Card>

                {/* User List */}
                <Card className="p-5">
                    <h2 className="mb-4 text-lg font-semibold text-slate-900">Users</h2>
                    {users.length === 0 ? (
                        <EmptyState title="No users found" />
                    ) : (
                        <Table>
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-left">Username</th>
                                    <th className="px-4 py-3 font-semibold text-left">Full Name</th>
                                    <th className="px-4 py-3 font-semibold text-left">Page Access</th>
                                    <th className="px-4 py-3 font-semibold text-left">Status</th>
                                    <th className="px-4 py-3 font-semibold text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((user) => {
                                    const pages = user.allowed_pages ?? ALL_PATHS
                                    const labels = PAGE_PERMISSIONS.filter((p) =>
                                        pages.includes(p.path),
                                    ).map((p) => p.label)

                                    return (
                                        <tr key={user.id ?? user.username}>
                                            <td className="px-4 py-3 font-medium text-slate-900">
                                                {user.username}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {user.fullname || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {labels.length === PAGE_PERMISSIONS.length ? (
                                                    <span className="text-xs text-slate-500">All pages</span>
                                                ) : labels.length === 0 ? (
                                                    <span className="text-xs text-red-500">No access</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {labels.map((label) => (
                                                            <span
                                                                key={label}
                                                                className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700"
                                                            >
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
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(user)}
                                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Pencil className="size-3" />
                                                    Permissions
                                                </button>
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

                        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                            {PAGE_PERMISSIONS.map((page) => (
                                <label key={page.path} className="flex cursor-pointer items-center gap-2.5">
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
