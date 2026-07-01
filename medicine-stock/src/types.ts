export type Drug = {
    id: number
    barcode: string
    drug_name: string
    current_stock: number
    min_stock: number
    unit_per_scan: number
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
    { path: '/inventory', label: 'Inventory' },
    { path: '/issue', label: 'Dispense Medicine' },
    { path: '/receive', label: 'Receive Medicine' },
    { path: '/scan', label: 'Stock Lookup' },
    { path: '/print', label: 'Print Barcode' },
]
