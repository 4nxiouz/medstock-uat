import type { ReactNode } from 'react'

type Props = { name: string; className?: string }

type Category = {
    keywords: string[]
    bg: string
    iconBg: string
    label: string
    svg: () => ReactNode
}

const categories: Category[] = [
    {
        // IV / saline bag
        keywords: ['normal saline', 'n/s', 'ringer', 'dextrose', 'iv fluid', 'iv solution', 'iv bag', 'lactated', 'สารน้ำ', '0.9%nacl', 'nacl', 'sodium chloride', 'hartmann'],
        bg: 'from-sky-100 to-cyan-50',
        iconBg: '#0369A1',
        label: 'IV / Saline',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <rect x="22" y="10" width="20" height="32" rx="10" fill="#BAE6FD" stroke="#0369A1" strokeWidth="1.5" />
                <rect x="28" y="6" width="8" height="6" rx="2" fill="#7DD3FC" stroke="#0369A1" strokeWidth="1.5" />
                <path d="M22 30 Q32 26 42 30 V40 Q42 50 32 50 Q22 50 22 40 Z" fill="#38BDF8" opacity="0.6" />
                <line x1="32" y1="50" x2="32" y2="58" stroke="#0369A1" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="32" cy="59" r="2" fill="#0369A1" opacity="0.5" />
            </svg>
        ),
    },
    {
        // Spray / inhaler
        keywords: ['salbutamol', 'ventolin', 'spray', 'inhaler', 'aerosol', 'nasal spray', 'oxymet', 'oxymetazoline', 'fluticasone', 'budesonide', 'mdi', 'puffer'],
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
        keywords: ['cream', 'ointment', 'gel', 'lotion', 'paste', 'ครีม', 'ยาทา', 'silverderm', 'silver sulfadiazine', 'lidocaine gel', 'lignocaine gel', 'lidocaine topical', 'lidocaine cream', 'hydrogel', 'mupirocin', 'bacitracin'],
        bg: 'from-yellow-100 to-amber-50',
        iconBg: '#D97706',
        label: 'Cream',
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
        keywords: ['injection', 'inject', 'vaccine', 'insulin', 'syringe', 'วัคซีน', 'ฉีด', 'tramol', 'tramadol', 'morphine', 'pethidine', 'fentanyl', 'ketorolac', 'diclofenac inj', 'ondansetron inj', 'metoclopramide inj', 'dexamethasone inj', 'hydrocortisone inj', 'adrenaline', 'epinephrine', 'atropine inj', 'lidocaine inj', 'dopamine', 'norepinephrine', 'furosemide inj', 'omeprazole inj', 'pantoprazole inj', 'amikacin', 'ceftriaxone', 'ampicillin inj', 'benzylpenicillin', 'gentamicin', 'clindamycin inj', 'metronidazole inj', 'heparin'],
        bg: 'from-rose-100 to-red-50',
        iconBg: '#DC2626',
        label: 'Injection',
        svg: () => (
            <svg viewBox="0 0 64 64" fill="none" className="size-14">
                <line x1="12" y1="52" x2="52" y2="12" stroke="#FCA5A5" strokeWidth="3" strokeLinecap="round" />
                <rect x="28" y="20" width="20" height="10" rx="2" transform="rotate(45 28 20)" fill="#FEE2E2" stroke="#DC2626" strokeWidth="1.5" />
                <rect x="24" y="26" width="20" height="12" rx="2" transform="rotate(45 24 26)" fill="#FECACA" stroke="#DC2626" strokeWidth="1.5" />
                <line x1="30" y1="30" x2="34" y2="26" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="2 2" />
                <polygon points="48,10 56,16 54,18 46,12" fill="#DC2626" />
            </svg>
        ),
    },
    {
        keywords: ['vitamin', 'supplement', 'mineral', 'calcium', 'zinc', 'iron', 'vit ', 'วิตามิน', 'อาหารเสริม'],
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
        // Default — tablet/pill
        keywords: [],
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

function detectCategory(name: string): Category {
    const lower = name.toLowerCase()
    return (
        categories.find((c) => c.keywords.some((kw) => lower.includes(kw))) ??
        categories[categories.length - 1]
    )
}

export default function DrugIcon({ name, className }: Props) {
    const cat = detectCategory(name)
    return (
        <div className={`flex size-full flex-col items-center justify-center bg-gradient-to-br ${cat.bg} ${className ?? ''}`}>
            {cat.svg()}
            <span className="mt-1 text-[10px] font-medium" style={{ color: cat.iconBg }}>
                {cat.label}
            </span>
        </div>
    )
}
