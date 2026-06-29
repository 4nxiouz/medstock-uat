import { Building2, MapPin, Pencil, Plus, Trash2, UserCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import FormInput from '../components/FormInput'
import PageLayout from '../components/PageLayout'
import Table from '../components/Table'
import { supabase } from '../lib/supabase'
import type { Location, UserProfile } from '../types'

type PageProps = { onLogout: () => void }
type UserWithLocations = UserProfile & { locationIds: number[] }

function LocationManage({ onLogout }: PageProps) {
    const [locations, setLocations] = useState<Location[]>([])
    const [users, setUsers] = useState<UserWithLocations[]>([])
    const [newCode, setNewCode] = useState('')
    const [newName, setNewName] = useState('')
    const [message, setMessage] = useState('')
    const [msgType, setMsgType] = useState<'ok' | 'error'>('ok')
    const [editingLoc, setEditingLoc] = useState<Location | null>(null)
    const [editCode, setEditCode] = useState('')
    const [editName, setEditName] = useState('')
    const [assignUser, setAssignUser] = useState<UserWithLocations | null>(null)
    const [assignLocIds, setAssignLocIds] = useState<number[]>([])

    useEffect(() => {
        void loadAll()
    }, [])

    async function loadAll() {
        const [locRes, userRes, ulRes] = await Promise.all([
            supabase.from('location').select('id, code, name, s_active').order('code'),
            supabase.from('user_profile').select('id, username, fullname, role, s_active').order('username'),
            supabase.from('user_location').select('user_id, location_id'),
        ])

        const locs = (locRes.data || []) as Location[]
        const rawUsers = (userRes.data || []) as UserProfile[]
        const uls = (ulRes.data || []) as { user_id: string; location_id: number }[]

        setLocations(locs)
        setUsers(rawUsers.map((u) => ({
            ...u,
            locationIds: uls.filter((ul) => ul.user_id === u.id).map((ul) => ul.location_id),
        })))
    }

    function msg(text: string, type: 'ok' | 'error' = 'ok') {
        setMessage(text); setMsgType(type)
    }

    async function handleAddLocation() {
        msg('')
        if (!newCode.trim() || !newName.trim()) { msg('Code and name are required.', 'error'); return }
        const { error } = await supabase.from('location').insert([{ code: newCode.trim().toUpperCase(), name: newName.trim(), s_active: true }])
        if (error) { msg('Failed: ' + error.message, 'error'); return }
        msg('Location added.')
        setNewCode(''); setNewName('')
        void loadAll()
    }

    async function handleSaveEdit() {
        if (!editingLoc) return
        const { error } = await supabase.from('location').update({ code: editCode.trim().toUpperCase(), name: editName.trim() }).eq('id', editingLoc.id)
        if (error) { msg('Failed: ' + error.message, 'error'); return }
        setEditingLoc(null)
        msg('Location updated.')
        void loadAll()
    }

    async function handleDeleteLocation(loc: Location) {
        if (!window.confirm(`Delete location "${loc.name}"? Users assigned here will lose access.`)) return
        await supabase.from('user_location').delete().eq('location_id', loc.id)
        const { error } = await supabase.from('location').delete().eq('id', loc.id)
        if (error) { msg('Failed: ' + error.message, 'error'); return }
        msg(`Deleted ${loc.name}.`)
        void loadAll()
    }

    function openAssign(user: UserWithLocations) {
        setAssignUser(user)
        setAssignLocIds([...user.locationIds])
    }

    async function handleSaveAssign() {
        if (!assignUser) return
        await supabase.from('user_location').delete().eq('user_id', assignUser.id!)
        if (assignLocIds.length > 0) {
            await supabase.from('user_location').insert(assignLocIds.map((lid) => ({ user_id: assignUser.id!, location_id: lid })))
        }
        setUsers((cur) => cur.map((u) => u.id === assignUser.id ? { ...u, locationIds: assignLocIds } : u))
        setAssignUser(null)
        msg('Location assignments saved.')
    }

    function toggleAssign(id: number) {
        setAssignLocIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
    }

    return (
        <PageLayout title="Location Management" subtitle="Manage clinic locations and user assignments." onLogout={onLogout}>
            {message && (
                <div className={`mb-4 rounded-md px-4 py-3 text-sm ${msgType === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{message}</div>
            )}

            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                {/* Add + list locations */}
                <div className="space-y-5">
                    <Card className="p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Plus className="size-5" /></div>
                            <h2 className="font-semibold text-slate-900">Add Location</h2>
                        </div>
                        <div className="space-y-3">
                            <FormInput label="Code (e.g. OPC)" placeholder="OPC" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
                            <FormInput label="Name" placeholder="Outpatient Clinic" value={newName} onChange={(e) => setNewName(e.target.value)} />
                            <button type="button" onClick={() => void handleAddLocation()}
                                className="h-11 w-full rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800">
                                Add Location
                            </button>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h2 className="mb-4 font-semibold text-slate-900">Locations ({locations.length})</h2>
                        {locations.length === 0 ? <EmptyState title="No locations yet" /> : (
                            <div className="space-y-2">
                                {locations.map((loc) => (
                                    <div key={loc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                                        <MapPin className="size-4 shrink-0 text-blue-500" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-900">{loc.code}</div>
                                            <div className="truncate text-xs text-slate-500">{loc.name}</div>
                                        </div>
                                        <button type="button" onClick={() => { setEditingLoc(loc); setEditCode(loc.code); setEditName(loc.name) }}
                                            className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button type="button" onClick={() => void handleDeleteLocation(loc)}
                                            className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 text-red-500 hover:bg-red-50">
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* User location assignments */}
                <Card className="p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <Building2 className="size-5 text-blue-600" />
                        <h2 className="font-semibold text-slate-900">User Location Assignments</h2>
                    </div>
                    {users.length === 0 ? <EmptyState title="No users found" /> : (
                        <Table>
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">User</th>
                                    <th className="px-4 py-3 text-left font-semibold">Assigned Locations</th>
                                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((user) => {
                                    const userLocs = locations.filter((l) => user.locationIds.includes(l.id))
                                    return (
                                        <tr key={user.id}>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900">{user.username}</div>
                                                <div className="text-xs text-slate-500">{user.fullname || ''} · {user.role}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.role === 'admin' ? (
                                                    <span className="text-xs text-amber-600 font-medium">All locations (admin)</span>
                                                ) : userLocs.length === 0 ? (
                                                    <span className="text-xs text-red-500">No location assigned</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {userLocs.map((l) => (
                                                            <span key={l.id} className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{l.code}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button type="button" onClick={() => openAssign(user)}
                                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                                    <UserCheck className="size-3" />Assign
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

            {/* Edit location modal */}
            {editingLoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Edit Location</h3>
                            <button type="button" onClick={() => setEditingLoc(null)} className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="size-4" /></button>
                        </div>
                        <div className="space-y-3">
                            <FormInput label="Code" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                            <FormInput label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => setEditingLoc(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void handleSaveEdit()} className="flex-1 rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign locations to user modal */}
            {assignUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Assign Locations</h3>
                                <p className="text-sm text-slate-500">{assignUser.fullname || assignUser.username}</p>
                            </div>
                            <button type="button" onClick={() => setAssignUser(null)} className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="size-4" /></button>
                        </div>
                        <div className="space-y-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 p-4">
                            {locations.map((loc) => (
                                <label key={loc.id} className="flex cursor-pointer items-center gap-3">
                                    <input type="checkbox" checked={assignLocIds.includes(loc.id)} onChange={() => toggleAssign(loc.id)}
                                        className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-sm font-medium text-slate-700">{loc.code}</span>
                                    <span className="text-sm text-slate-500">{loc.name}</span>
                                </label>
                            ))}
                            {locations.length === 0 && <p className="text-sm text-slate-500">No locations to assign.</p>}
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => setAssignUser(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void handleSaveAssign()} className="flex-1 rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

export default LocationManage
