/* Hand-drawn style menu illustrations (SVG) used when a menu item has no photo.
   Picked by keywords in the item name, so new items get a sensible picture automatically. */
import type { ReactNode } from 'react'

export type FoodKey =
  | 'set' | 'belly' | 'neck' | 'marinated' | 'chicken' | 'squid' | 'liver' | 'veg' | 'enoki' | 'noodle'
  | 'egg' | 'sauce' | 'water' | 'soda' | 'softdrink' | 'beer' | 'ice' | 'beerpromo' | 'plate'

export function foodKey(name: string, kind?: string): FoodKey {
  const n = name.toLowerCase()
  if (n.includes('โปร') && n.includes('เบียร์')) return 'beerpromo'
  if (kind === 'set' || n.includes('เซ็ต')) return 'set'
  if (n.includes('เบียร์')) return 'beer'
  if (n.includes('น้ำแข็ง')) return 'ice'
  if (n.includes('น้ำอัดลม')) return 'softdrink'
  if (n.includes('โซดา')) return 'soda'
  if (n.includes('น้ำเปล่า') || n.includes('น้ำดื่ม')) return 'water'
  if (n.includes('น้ำจิ้ม')) return 'sauce'
  if (n.includes('สามชั้น')) return 'belly'
  if (n.includes('สันคอ')) return 'neck'
  if (n.includes('ไข่')) return 'egg'
  if (n.includes('ไก่')) return 'chicken'
  if (n.includes('หมัก')) return 'marinated'
  if (n.includes('หมึก')) return 'squid'
  if (n.includes('ตับ')) return 'liver'
  if (n.includes('เห็ด')) return 'enoki'
  if (n.includes('วุ้นเส้น') || n.includes('เส้น')) return 'noodle'
  if (n.includes('ผัก')) return 'veg'
  if (n.includes('หมู')) return 'neck'
  return 'plate'
}

/* shared pieces */
const Plate = ({ tint = '#1d3d48' }: { tint?: string }) => (
  <>
    <circle cx="48" cy="50" r="40" fill="#0b171b" opacity=".35" />
    <circle cx="48" cy="48" r="40" fill={tint} />
    <circle cx="48" cy="48" r="33" fill="none" stroke="#fff6ea" strokeOpacity=".12" strokeWidth="2" />
  </>
)
const Slice = ({ x, y, r = 0, a, b, w = 34, h = 13 }: { x: number; y: number; r?: number; a: string; b: string; w?: number; h?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={a} />
    <path d={`M${-w / 2 + 4} 0 Q ${-w / 4} ${-h / 3} 0 0 T ${w / 2 - 4} 0`} fill="none" stroke={b} strokeWidth="2.2" strokeLinecap="round" />
  </g>
)
const Bottle = ({ x, body, cap, label, h = 52 }: { x: number; body: string; cap: string; label: string; h?: number }) => (
  <g transform={`translate(${x} ${84 - h})`}>
    <rect x="-3.5" y="0" width="7" height="5" rx="1.5" fill={cap} />
    <path d={`M-3 5 h6 v8 q8 4 8 12 v${h - 27} q0 2 -2 2 h-18 q-2 0 -2 -2 v${-(h - 27)} q0 -8 8 -12z`} fill={body} />
    <rect x="-9" y={h * 0.55} width="18" height={h * 0.22} rx="2" fill={label} />
    <path d={`M-6 ${h * 0.3} v${h * 0.5}`} stroke="#fff" strokeOpacity=".3" strokeWidth="2.5" strokeLinecap="round" />
  </g>
)
const Cube = ({ x, y, s = 9, r = 0 }: { x: number; y: number; s?: number; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <rect x={-s / 2} y={-s / 2} width={s} height={s} rx="2" fill="#dff4fb" />
    <path d={`M${-s / 2 + 2} ${-s / 2 + 2} h${s / 2.5}`} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
  </g>
)
const Bucket = ({ cubes = true }: { cubes?: boolean }) => (
  <g>
    <path d="M24 46 h48 l-5 36 q-1 4 -5 4 h-28 q-4 0 -5 -4z" fill="#b9c7cc" />
    <path d="M24 46 h48 l-1 6 h-46z" fill="#8fa2a8" />
    <path d="M30 56 v24 M40 56 v26 M56 56 v26 M66 56 v24" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
    {cubes && <><Cube x={34} y={42} r={-10} /><Cube x={45} y={38} r={12} /><Cube x={56} y={41} r={-6} /><Cube x={64} y={44} s={8} r={20} /></>}
  </g>
)

const ART: Record<FoodKey, () => ReactNode> = {
  set: () => (
    <>
      <circle cx="48" cy="48" r="44" fill="#16303a" />
      {/* charcoal glow + moat */}
      <ellipse cx="48" cy="70" rx="30" ry="9" fill="#ff8a3d" opacity=".8" />
      <ellipse cx="48" cy="58" rx="36" ry="16" fill="#ffc861" />
      <ellipse cx="48" cy="56" rx="32" ry="12" fill="#e9a23b" />
      {/* veggies in the soup */}
      <path d="M20 56 q4 -6 9 -2 q-3 5 -9 2z M70 52 q5 -5 9 0 q-4 5 -9 0z" fill="#5fbf6a" />
      <circle cx="30" cy="62" r="2.6" fill="#fff6ea" /><circle cx="66" cy="63" r="2.6" fill="#fff6ea" />
      {/* dome */}
      <path d="M26 54 c0 -17 10 -28 22 -28 s22 11 22 28 c-6 3 -38 3 -44 0z" fill="#3b4a4f" />
      {/* meat on the dome */}
      <Slice x={40} y={40} r={-30} w={20} h={8} a="#f2a3a0" b="#fff3ee" />
      <Slice x={55} y={42} r={25} w={20} h={8} a="#d9776f" b="#f6c0b9" />
      <Slice x={48} y={31} r={0} w={16} h={7} a="#b8543f" b="#e48a5c" />
      {/* steam */}
      <path d="M38 20 c-3 -4 3 -6 0 -11 M48 18 c-3 -4 3 -6 0 -11 M58 20 c-3 -4 3 -6 0 -11" fill="none" stroke="#fff6ea" strokeOpacity=".6" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  belly: () => (<><Plate /><Slice x={46} y={36} r={-12} a="#f4b2ad" b="#fff4ef" /><Slice x={50} y={50} r={-6} a="#ef9f99" b="#fff4ef" /><Slice x={46} y={64} r={4} a="#f4b2ad" b="#fff4ef" /></>),
  neck: () => (<><Plate /><Slice x={44} y={38} r={-18} w={32} h={16} a="#e88b84" b="#f9d0c9" /><Slice x={52} y={56} r={8} w={32} h={16} a="#dd7c74" b="#f9d0c9" /></>),
  marinated: () => (
    <>
      <Plate />
      <Slice x={45} y={38} r={-14} w={32} h={14} a="#b8543f" b="#e48a5c" />
      <Slice x={51} y={56} r={6} w={32} h={14} a="#a8472f" b="#e48a5c" />
      {[[36, 34], [52, 40], [44, 58], [60, 54], [40, 46]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="1.6" ry="1" fill="#fff6ea" />)}
    </>
  ),
  chicken: () => (
    <>
      <Plate />
      <path d="M30 44 q4 -12 18 -10 q12 2 10 14 q-2 10 -16 10 q-14 -2 -12 -14z" fill="#e7a246" />
      <path d="M50 56 q6 -8 16 -4 q8 4 4 12 q-4 8 -14 6 q-8 -4 -6 -14z" fill="#d88d33" />
      <path d="M36 42 q6 -4 12 0 M56 60 q4 -3 8 0" stroke="#ffd27a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="62" r="2" fill="#c0392b" /><circle cx="62" cy="40" r="2" fill="#5fbf6a" />
    </>
  ),
  squid: () => (
    <>
      <Plate />
      {[[36, 40], [56, 38], [46, 56]].map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y} r="9" fill="none" stroke="#fbe6dc" strokeWidth="5" /><circle cx={x} cy={y} r="9" fill="none" stroke="#f2b8a5" strokeWidth="1.2" /></g>
      ))}
      <path d="M58 58 q4 8 0 14 M62 57 q6 6 4 13 M66 55 q7 4 7 11" fill="none" stroke="#f2b8a5" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  liver: () => (<><Plate /><Slice x={45} y={40} r={-10} w={30} h={15} a="#6e2a2a" b="#9c4646" /><Slice x={51} y={57} r={8} w={30} h={15} a="#7a3030" b="#9c4646" /></>),
  veg: () => (
    <>
      <Plate tint="#1b3a33" />
      <path d="M26 58 q8 -26 26 -30 q-2 22 -26 30z" fill="#4caf50" />
      <path d="M44 66 q4 -26 26 -32 q2 24 -26 32z" fill="#6cc76a" />
      <path d="M30 56 q10 -12 20 -24 M48 64 q10 -14 20 -26" stroke="#c9f0b8" strokeWidth="1.6" fill="none" />
      <ellipse cx="38" cy="66" rx="12" ry="7" fill="#e7f4d8" /><path d="M30 66 q8 -3 16 0" stroke="#b8d99c" strokeWidth="1.5" fill="none" />
    </>
  ),
  enoki: () => (
    <>
      <Plate />
      <path d="M36 72 q12 4 24 0 l-3 -8 h-18z" fill="#c9a777" />
      {Array.from({ length: 9 }, (_, i) => {
        const x = 36 + i * 3
        return <g key={i}><path d={`M${x + 1.5} 66 Q ${x + (i - 4) * 1.2} 44 ${x + (i - 4) * 2.4} 26`} stroke="#fbf3df" strokeWidth="2" fill="none" /><circle cx={x + (i - 4) * 2.4} cy={25} r="2.6" fill="#fff9ea" /></g>
      })}
    </>
  ),
  noodle: () => (
    <>
      <Plate />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={48 + (i % 2 ? 3 : -3)} cy={48 + (i - 2) * 3} rx={22 - i * 2} ry={12 - i} fill="none" stroke="#eef6f5" strokeOpacity=".85" strokeWidth="2" />
      ))}
    </>
  ),
  egg: () => (
    <>
      <Plate />
      <ellipse cx="38" cy="50" rx="13" ry="16" fill="#f6dfc0" transform="rotate(-14 38 50)" />
      <ellipse cx="58" cy="50" rx="13" ry="16" fill="#f1d4ad" transform="rotate(12 58 50)" />
      <path d="M32 42 q2 -6 6 -7 M53 42 q2 -6 6 -7" stroke="#fff" strokeOpacity=".6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  sauce: () => (
    <>
      <Plate />
      <ellipse cx="48" cy="56" rx="26" ry="16" fill="#e9eef0" />
      <ellipse cx="48" cy="52" rx="22" ry="11" fill="#d6492b" />
      <ellipse cx="48" cy="50" rx="18" ry="7" fill="#e8623c" />
      {[[40, 49], [50, 47], [56, 52], [44, 53], [52, 55]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill={i % 2 ? '#fff3c4' : '#5fbf6a'} />)}
      <path d="M68 30 q8 -2 6 10 q-6 4 -10 -2z" fill="#c0392b" /><path d="M68 30 q1 -4 4 -5" stroke="#4caf50" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  water: () => (<><Plate /><Bottle x={48} body="#cfeaf3" cap="#3b8fd6" label="#3b8fd6" h={58} /></>),
  soda: () => (
    <>
      <Plate />
      <Bottle x={48} body="#a9dcc6" cap="#e8b84a" label="#fff6ea" h={56} />
      {[[44, 50], [50, 58], [46, 66], [52, 44]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" opacity=".8" />)}
    </>
  ),
  softdrink: () => (
    <>
      <Plate />
      <path d="M32 30 h32 l-4 50 q0 4 -4 4 h-16 q-4 0 -4 -4z" fill="#e9f3f5" opacity=".35" />
      <path d="M34 42 h28 l-3 37 q0 3 -3 3 h-16 q-3 0 -3 -3z" fill="#5b2a1c" />
      <Cube x={42} y={46} s={8} r={-12} /><Cube x={53} y={48} s={8} r={14} />
      <path d="M56 18 l-6 30" stroke="#ff8a3d" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  beer: () => (
    <>
      <Plate />
      <Bottle x={38} body="#3d5a2a" cap="#d4a017" label="#e9dfc4" h={60} />
      <path d="M52 44 h20 l-2 34 q0 4 -4 4 h-8 q-4 0 -4 -4z" fill="#f2b632" />
      <path d="M51 44 q2 -7 7 -5 q3 -5 8 -1 q5 -2 7 6z" fill="#fff9ea" />
      {[[58, 60], [64, 68], [60, 74]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.3" fill="#fff" opacity=".7" />)}
    </>
  ),
  ice: () => (<><Plate /><Bucket /></>),
  beerpromo: () => (
    <>
      <circle cx="48" cy="48" r="44" fill="#16303a" />
      <g transform="translate(0 -18)">
        <Bottle x={34} body="#3d5a2a" cap="#d4a017" label="#e9dfc4" h={56} />
        <Bottle x={48} body="#5a3a1a" cap="#d4a017" label="#e9dfc4" h={60} />
        <Bottle x={62} body="#3d5a2a" cap="#d4a017" label="#e9dfc4" h={56} />
      </g>
      <g transform="translate(9.6 22) scale(.8)"><Bucket cubes={false} /></g>
      <Cube x={36} y={57} r={-14} /><Cube x={48} y={55} r={8} /><Cube x={60} y={57} r={16} />
      <circle cx="76" cy="22" r="13" fill="#ff6a2a" />
      <text x="76" y="26.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff6ea" fontFamily="Mitr, sans-serif">โปร</text>
    </>
  ),
  plate: () => (
    <>
      <Plate />
      <path d="M30 70 L66 26 M36 72 L70 30" stroke="#c9a777" strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
}

export function FoodArt({ name, kind, className, size = 72 }: { name: string; kind?: string; className?: string; size?: number }) {
  const key = foodKey(name, kind)
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 96 96" role="img" aria-label={name}>
      {ART[key]()}
    </svg>
  )
}

/** Photo if the item has one, otherwise the illustration. */
export function MenuThumb({ name, kind, imageUrl, className }: { name: string; kind?: string; imageUrl: string | null; className: string }) {
  return imageUrl ? <img src={imageUrl} alt="" className={className} /> : <FoodArt name={name} kind={kind} className={`${className} art`} />
}
