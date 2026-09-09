import type { ReactNode } from 'react'

type Props = { name: string; category?: string | null; iconType?: string | null; className?: string }

type Category = {
    keywords: string[]
    categoryNames: string[]   // drug_master.category values that map here
    bg: string
    iconBg: string
    label: string
    svg: () => ReactNode
}

const categories: Category[] = [
    {
        // IV / saline bag
        keywords: ['normal saline', 'n/s', 'ringer', 'dextrose', 'iv fluid', 'iv solution', 'iv bag', 'lactated', 'สารน้ำ', '0.9%nacl', 'nacl', 'sodium chloride', 'hartmann'],
        categoryNames: ['สารน้ำและ iv', 'สารน้ำและอุปกรณ์', 'iv fluid', 'สารน้ำ'],
        bg: 'from-sky-100 to-cyan-50',
        iconBg: '#0369A1',
        label: 'สารน้ำและอุปกรณ์',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                {/* saline bottle */}
                <rect x="24" y="8" width="16" height="4" rx="2" fill="#7DD3FC" stroke="#0369A1" strokeWidth="1.5" />
                <path d="M20 16 L24 12 H40 L44 16 V52 Q44 56 40 56 H24 Q20 56 20 52 Z" fill="#BAE6FD" stroke="#0369A1" strokeWidth="1.5" />
                <path d="M20 38 Q32 34 44 38 V52 Q44 56 40 56 H24 Q20 56 20 52 Z" fill="#38BDF8" opacity="0.5" />
                <text x="32" y="30" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0369A1">N/S</text>
                <line x1="32" y1="4" x2="32" y2="8" stroke="#0369A1" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="32" cy="3" r="1.5" fill="#0369A1" opacity="0.5" />
            </svg>
        ),
    },
    {
        // Spray / inhaler
        keywords: ['salbutamol', 'ventolin', 'spray', 'inhaler', 'aerosol', 'nasal spray', 'oxymet', 'oxymetazoline', 'fluticasone', 'budesonide', 'mdi', 'puffer'],
        categoryNames: ['spray', 'inhaler', 'ยาพ่น'],
        bg: 'from-indigo-100 to-blue-50',
        iconBg: '#4338CA',
        label: 'Spray',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <rect x="22" y="24" width="16" height="28" rx="5" fill="#C7D2FE" stroke="#4338CA" strokeWidth="1.5" />
                <rect x="24" y="18" width="12" height="8" rx="3" fill="#A5B4FC" stroke="#4338CA" strokeWidth="1.5" />
                <rect x="34" y="16" width="10" height="5" rx="2" fill="#818CF8" stroke="#4338CA" strokeWidth="1.5" />
                <path d="M44 14 Q50 11 54 8" stroke="#4338CA" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                <path d="M44 16 Q51 15 56 14" stroke="#4338CA" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
                <path d="M44 18 Q50 19 54 22" stroke="#4338CA" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
            </svg>
        ),
    },
    {
        keywords: ['capsule', 'cap ', 'cap.', 'amoxicillin', 'omeprazole', 'clarithromycin', 'doxycycline'],
        categoryNames: ['ยาแคปซูล', 'capsule'],
        bg: 'from-violet-100 to-purple-50',
        iconBg: '#7C3AED',
        label: 'Capsule',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <ellipse cx="32" cy="32" rx="22" ry="12" transform="rotate(-40 32 32)" fill="#DDD6FE" />
                <path d="M18.5 42.5 Q32 28 45.5 21.5" stroke="#7C3AED" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                <path d="M18.5 21.5 Q32 32 45.5 42.5" clipPath="url(#cap-clip)" fill="#7C3AED" opacity="0.9" />
                <clipPath id="cap-clip">
                    <ellipse cx="32" cy="32" rx="22" ry="12" transform="rotate(-40 32 32)" />
                </clipPath>
                <ellipse cx="32" cy="32" rx="22" ry="12" transform="rotate(-40 32 32)" stroke="#6D28D9" strokeWidth="1.5" fill="none" />
            </svg>
        ),
    },
    {
        keywords: ['syrup', 'suspension', 'liquid', 'solution', 'drops', 'drop', 'น้ำเชื่อม', 'ยาน้ำ'],
        categoryNames: ['ยาน้ำ', 'ยาน้ำเชื่อม', 'syrup', 'ยาน้ำแขวนตะกอน'],
        bg: 'from-cyan-100 to-sky-50',
        iconBg: '#0891B2',
        label: 'Syrup',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <rect x="24" y="14" width="16" height="6" rx="3" fill="#A5F3FC" stroke="#0891B2" strokeWidth="1.5" />
                <path d="M22 20 H42 V50 Q42 54 38 54 H26 Q22 54 22 50 Z" fill="#CFFAFE" stroke="#0891B2" strokeWidth="1.5" />
                <path d="M22 38 Q32 34 42 38 V50 Q42 54 38 54 H26 Q22 54 22 50 Z" fill="#67E8F9" />
                <circle cx="32" cy="30" r="4" fill="#0891B2" opacity="0.25" />
                <circle cx="28" cy="44" r="2" fill="#0891B2" opacity="0.3" />
                <circle cx="35" cy="46" r="1.5" fill="#0891B2" opacity="0.2" />
            </svg>
        ),
    },
    {
        keywords: ['cream', 'ointment', 'gel', 'lotion', 'paste', 'ครีม', 'ยาทา', 'silverderm', 'silver sulfadiazine', 'lidocaine', 'lignocaine', 'hydrogel', 'mupirocin', 'bacitracin'],
        categoryNames: ['ยาทา', 'ครีม', 'gel', 'ยาทาภายนอก'],
        bg: 'from-yellow-100 to-amber-50',
        iconBg: '#D97706',
        label: 'Cream / Gel',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <rect x="20" y="28" width="24" height="26" rx="4" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
                <rect x="24" y="22" width="16" height="8" rx="2" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
                <rect x="27" y="18" width="10" height="5" rx="2" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
                <path d="M26 38 Q32 34 38 38" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M27 44 Q32 41 37 44" stroke="#D97706" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
            </svg>
        ),
    },
    {
        keywords: ['injection', 'inject', 'vaccine', 'insulin', 'syringe', 'วัคซีน', 'ฉีด', 'tramol', 'tramadol', 'morphine', 'pethidine', 'fentanyl', 'ketorolac', 'diclofenac inj', 'ondansetron inj', 'metoclopramide inj', 'dexamethasone inj', 'hydrocortisone inj', 'adrenaline', 'epinephrine', 'atropine', 'dopamine', 'norepinephrine', 'furosemide inj', 'omeprazole inj', 'pantoprazole inj', 'amikacin', 'ceftriaxone', 'ampicillin inj', 'benzylpenicillin', 'gentamicin', 'clindamycin inj', 'metronidazole inj', 'heparin'],
        categoryNames: ['ยาฉีด', 'injection', 'วัคซีน'],
        bg: 'from-rose-100 to-red-50',
        iconBg: '#DC2626',
        label: 'ยาฉีด',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                {/* syringe body */}
                <rect x="10" y="29" width="34" height="6" rx="3" fill="#FECACA" stroke="#DC2626" strokeWidth="1.5" />
                {/* plunger handle */}
                <rect x="6" y="26" width="6" height="12" rx="1.5" fill="#FCA5A5" stroke="#DC2626" strokeWidth="1.5" />
                {/* plunger rod */}
                <line x1="12" y1="32" x2="44" y2="32" stroke="#DC2626" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
                {/* needle hub */}
                <rect x="44" y="30" width="6" height="4" rx="1" fill="#DC2626" />
                {/* needle */}
                <line x1="50" y1="32" x2="58" y2="32" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                {/* graduation marks */}
                <line x1="20" y1="29" x2="20" y2="27" stroke="#DC2626" strokeWidth="1" opacity="0.5" />
                <line x1="28" y1="29" x2="28" y2="27" stroke="#DC2626" strokeWidth="1" opacity="0.5" />
                <line x1="36" y1="29" x2="36" y2="27" stroke="#DC2626" strokeWidth="1" opacity="0.5" />
                {/* liquid fill */}
                <rect x="12" y="30" width="20" height="4" rx="1" fill="#FCA5A5" opacity="0.6" />
            </svg>
        ),
    },
    {
        keywords: ['vitamin', 'supplement', 'mineral', 'calcium', 'zinc', 'iron', 'vit ', 'วิตามิน', 'อาหารเสริม'],
        categoryNames: ['วิตามิน', 'อาหารเสริม', 'vitamin'],
        bg: 'from-orange-100 to-amber-50',
        iconBg: '#EA580C',
        label: 'Vitamin',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <circle cx="32" cy="32" r="18" fill="#FED7AA" stroke="#EA580C" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="12" fill="#FDBA74" />
                <text x="32" y="38" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#EA580C">C</text>
                <circle cx="20" cy="20" r="4" fill="#FED7AA" stroke="#EA580C" strokeWidth="1" />
                <text x="20" y="24" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#EA580C">B</text>
                <circle cx="44" cy="44" r="4" fill="#FED7AA" stroke="#EA580C" strokeWidth="1" />
                <text x="44" y="48" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#EA580C">D</text>
            </svg>
        ),
    },
    {
        keywords: ['plaster', 'bandage', 'dressing', 'gauze', 'cotton', 'tape', 'พลาสเตอร์', 'ผ้าพัน', 'wound', 'elastic', 'crepe', 'tegaderm', 'micropore', 'transpore', 'สำลี', 'ผ้าก๊อซ', 'วัสดุทำแผล'],
        categoryNames: ['พลาสเตอร์', 'วัสดุทำแผล'],
        bg: 'from-pink-100 to-rose-50',
        iconBg: '#DB2777',
        label: 'Plaster',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <rect x="12" y="26" width="40" height="12" rx="6" fill="#FBCFE8" stroke="#DB2777" strokeWidth="1.5" />
                <rect x="22" y="24" width="20" height="16" rx="3" fill="#FCE7F3" stroke="#DB2777" strokeWidth="1.5" />
                <rect x="28" y="28" width="8" height="8" rx="1" fill="#FDF2F8" stroke="#DB2777" strokeWidth="1" />
                <line x1="32" y1="29" x2="32" y2="35" stroke="#DB2777" strokeWidth="1" />
                <line x1="29" y1="32" x2="35" y2="32" stroke="#DB2777" strokeWidth="1" />
                <circle cx="16" cy="32" r="3" fill="#F9A8D4" />
                <circle cx="48" cy="32" r="3" fill="#F9A8D4" />
            </svg>
        ),
    },
    {
        keywords: ['eye', 'ear', 'nose', 'nasal', 'ophthal', 'ตา', 'หู', 'จมูก'],
        categoryNames: ['ยาหยอด', 'ยาหยอดตา', 'ยาหยอดหู'],
        bg: 'from-teal-100 to-emerald-50',
        iconBg: '#059669',
        label: 'Drops',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <path d="M32 12 Q44 26 44 36 A12 12 0 0 1 20 36 Q20 26 32 12Z" fill="#A7F3D0" stroke="#059669" strokeWidth="1.5" />
                <circle cx="32" cy="38" r="5" fill="#6EE7B7" stroke="#059669" strokeWidth="1" />
                <line x1="30" y1="24" x2="30" y2="32" stroke="#059669" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                <path d="M38 20 Q42 16 40 12" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <circle cx="40" cy="11" r="2" fill="#059669" opacity="0.4" />
            </svg>
        ),
    },
    {
        // Medical equipment — stethoscope
        keywords: [],
        categoryNames: ['อุปกรณ์การแพทย์', 'medical equipment', 'อุปกรณ์'],
        bg: 'from-slate-100 to-gray-50',
        iconBg: '#475569',
        label: 'อุปกรณ์การแพทย์',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                {/* stethoscope */}
                <path d="M20 14 Q20 26 28 30 Q36 34 36 44 Q36 52 44 52" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="44" cy="52" r="5" fill="#CBD5E1" stroke="#475569" strokeWidth="1.5" />
                <circle cx="44" cy="52" r="2.5" fill="#475569" />
                <path d="M24 14 Q24 24 28 28" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="18" cy="13" r="3.5" fill="#94A3B8" stroke="#475569" strokeWidth="1.5" />
                <circle cx="26" cy="13" r="3.5" fill="#94A3B8" stroke="#475569" strokeWidth="1.5" />
                {/* ear tubes */}
                <line x1="18" y1="9" x2="18" y2="6" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                <line x1="26" y1="9" x2="26" y2="6" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        // Consumables / supplies — scissors + roll
        keywords: [],
        categoryNames: ['วัสดุสิ้นเปลือง', 'consumable', 'consumables', 'สิ้นเปลือง'],
        bg: 'from-lime-100 to-green-50',
        iconBg: '#16A34A',
        label: 'วัสดุสิ้นเปลือง',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                {/* scissors */}
                <circle cx="18" cy="22" r="5" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.5" />
                <circle cx="18" cy="38" r="5" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.5" />
                <line x1="22" y1="24" x2="46" y2="42" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
                <line x1="22" y1="36" x2="46" y2="22" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
                {/* roll of tape */}
                <circle cx="46" cy="46" r="8" fill="#D1FAE5" stroke="#16A34A" strokeWidth="1.5" />
                <circle cx="46" cy="46" r="4" fill="#16A34A" opacity="0.15" />
                <circle cx="46" cy="46" r="2" fill="#16A34A" opacity="0.3" />
            </svg>
        ),
    },
    {
        // Default — tablet/pill
        keywords: [],
        categoryNames: ['ยาเม็ด', 'tablet'],
        bg: 'from-blue-100 to-indigo-50',
        iconBg: '#2563EB',
        label: 'Tablet',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <rect x="14" y="26" width="36" height="12" rx="6" fill="#BFDBFE" stroke="#2563EB" strokeWidth="1.5" />
                <rect x="14" y="26" width="18" height="12" rx="6" fill="#2563EB" />
                <line x1="32" y1="26" x2="32" y2="38" stroke="#1D4ED8" strokeWidth="1" />
                <circle cx="23" cy="32" r="4" fill="#1D4ED8" opacity="0.3" />
                <circle cx="23" cy="32" r="2" fill="#BFDBFE" opacity="0.6" />
            </svg>
        ),
    },
]

function detectCategory(name: string, category?: string | null, iconType?: string | null): Category {
    // 1. icon_type — explicit user pick, highest priority
    if (iconType) {
        const lower = iconType.toLowerCase()
        const byIcon = categories.find((c) =>
            c.categoryNames.some((cn) => lower.includes(cn.toLowerCase()))
        )
        if (byIcon) return byIcon
    }
    // 2. category from DB
    if (category) {
        const lowerCat = category.toLowerCase()
        const byCategory = categories.find((c) =>
            c.categoryNames.some((cn) => lowerCat.includes(cn.toLowerCase()))
        )
        if (byCategory) return byCategory
    }
    // 3. keyword fallback from drug name
    const lower = name.toLowerCase()
    return (
        categories.find((c) => c.keywords.some((kw) => lower.includes(kw))) ??
        categories[categories.length - 1]
    )
}

export type DrugIconOption = {
    label: string
    categoryName: string
    bg: string
    iconBg: string
    svg: () => ReactNode
}

export const DRUG_ICON_OPTIONS: DrugIconOption[] = categories.map((c) => ({
    label: c.label,
    categoryName: c.categoryNames[0] ?? c.label,
    bg: c.bg,
    iconBg: c.iconBg,
    svg: c.svg,
}))

export default function DrugIcon({ name, category, iconType, className }: Props) {
    const cat = detectCategory(name, category, iconType)
    return (
        <div className={`flex size-full items-center justify-center bg-gradient-to-br ${cat.bg} ${className ?? ''}`}>
            {cat.svg()}
        </div>
    )
}
