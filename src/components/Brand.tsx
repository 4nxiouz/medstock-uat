/** Mookata pan over charcoal — the shop's mark. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="mk-ember" cx="50%" cy="80%" r="60%">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset=".55" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#d9481a" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#12302f" />
      {/* charcoal glow */}
      <ellipse cx="32" cy="49" rx="18" ry="6" fill="url(#mk-ember)" opacity=".9" />
      {/* soup moat */}
      <ellipse cx="32" cy="38" rx="22" ry="9" fill="#ffc861" />
      <ellipse cx="32" cy="37" rx="19.5" ry="7" fill="#e9a23b" />
      {/* dome */}
      <path d="M17 36c0-10 6.7-17 15-17s15 7 15 17c-4 2-26 2-30 0z" fill="#3b4a4f" />
      <path d="M20 33c1-7 6-11.5 12-11.5S43 26 44 33" fill="none" stroke="#7f9599" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.5 3" />
      <path d="M26 29.5c2-1.6 4-2 6-2" fill="none" stroke="#fff6ea" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
      {/* steam */}
      <path d="M26 15c-2-2.5 2-4 0-7M33 14c-2-2.5 2-4 0-7M40 15c-2-2.5 2-4 0-7" fill="none" stroke="#fff6ea" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function BrandMark({ sub }: { sub?: string }) {
  return (
    <span className="brandmark">
      <Logo />
      <span className="bm-name">หมูกะทะริมน้ำ{sub && <span className="bm-sub">{sub}</span>}</span>
    </span>
  )
}

/** Row of glowing ping-pong lights. Purely decorative. */
export function Lights() {
  return <div className="lights" aria-hidden="true" />
}
