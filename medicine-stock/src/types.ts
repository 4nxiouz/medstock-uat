export type Drug = {
    id: number
    barcode: string
    drug_name: string
    current_stock: number
    min_stock: number
    unit_per_scan: number
    unit_per_scan_in?: number | null
    image_url?: string | null
    location_id?: number | null
    category?: string | null
}

export type StockTransaction = {
    id: number
    barcode: string
    qty: number
    action: 'IN' | 'OUT' | string
    created_by?: string | null
    created_at?: string | null
    location_id?: number | null
}

export type UserProfile = {
    id?: string
    username: string
    password_hash: string
    fullname?: string | null
    role?: string | null
    s_active: boolean
    allowed_pages?: string[] | null
}

export type Location = {
    id: number
    code: string
    name: string
    s_active: boolean
}

export const PAGE_PERMISSIONS: { path: string; label: string }[] = [
    { path: '/receive', label: 'In Stock' },
    { path: '/inventory', label: 'Stock' },
    { path: '/issue', label: 'Out Stock' },
    { path: '/print', label: 'Print Barcode' },
    { path: '/history', label: 'Transaction History' },
    { path: '/baglog', label: 'Bag Log' },
]

export type BagDispatch = {
    id: number
    bag_type: 'FAK' | 'EMK'
    order_no?: string | null
    serial_no: string
    equipment_no: string
    seal_number?: string | null
    type?: string | null
    status: 'OPEN' | 'CLOSE'
    cause_1?: 'Use' | 'Expire' | null
    cause_2?: string | null
    date_in?: string | null
    date_out: string
    remark?: string | null
    location_id?: number | null
    created_by?: string | null
    created_at?: string | null
}

export type BagDispatchDrug = {
    id: number
    dispatch_id: number
    barcode: string
    drug_name: string
    qty: number
}

export type BagUsageLog = {
    id: number
    dispatch_id: number
    opened_date?: string | null
    person?: string | null
    illness?: string | null
    used_item?: string | null
    flt_no?: string | null
    seal_no?: string | null
    remark?: string | null
    created_by?: string | null
    created_at?: string | null
}
