/* The shop's own icon set: rounded 1.8px strokes in currentColor, with a lantern-gold accent fill. */
import type { ReactNode } from 'react'

export type IconName =
  | 'table' | 'flame' | 'menu' | 'chart' | 'gear' | 'pan' | 'soup' | 'ice' | 'bell' | 'basket' | 'beer'
  | 'key' | 'moon' | 'pig' | 'user' | 'lantern' | 'chef' | 'qr' | 'logout' | 'eye' | 'eyeOff' | 'plus'
  | 'up' | 'down' | 'pencil'

const A = 'var(--icon-accent, #ffc861)'

const P: Record<IconName, ReactNode> = {
  table: (<><path d="M3 9h18" /><rect x="5" y="5" width="14" height="4" rx="2" fill={A} fillOpacity=".35" /><path d="M6 9v10M18 9v10M6 14h12" /></>),
  flame: (<><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 1.5.8 2.5 2 2.5 0-3-1-5 1-8z" fill={A} fillOpacity=".35" /><path d="M12 21a2.5 2.5 0 0 1-2.5-2.5c0-1.5 1.5-2.5 2.5-4 1 1.5 2.5 2.5 2.5 4A2.5 2.5 0 0 1 12 21z" /></>),
  menu: (<><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M9 8h6M9 12h6M9 16h3" /><circle cx="16" cy="16" r="1.4" fill={A} stroke="none" /></>),
  chart: (<><path d="M4 20h16" /><rect x="6" y="11" width="3" height="7" rx="1" fill={A} fillOpacity=".4" /><rect x="11" y="7" width="3" height="11" rx="1" /><rect x="16" y="13" width="3" height="5" rx="1" /></>),
  gear: (<><circle cx="12" cy="12" r="3" fill={A} fillOpacity=".4" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /><circle cx="12" cy="12" r="6.5" /></>),
  pan: (<><ellipse cx="12" cy="16" rx="9" ry="3.5" fill={A} fillOpacity=".35" /><path d="M5.5 15c0-5 2.9-8.5 6.5-8.5s6.5 3.5 6.5 8.5" /><path d="M9 3.5c-.8-1 .8-1.6 0-2.5M15 3.5c-.8-1 .8-1.6 0-2.5" /></>),
  soup: (<><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" fill={A} fillOpacity=".35" /><path d="M8 7c-.8-1 .8-1.8 0-3M12 7c-.8-1 .8-1.8 0-3M16 7c-.8-1 .8-1.8 0-3M9 20h6" /></>),
  ice: (<><path d="M5 9h14l-1.5 10.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5z" /><rect x="7" y="4" width="4.5" height="4.5" rx="1" fill={A} fillOpacity=".4" transform="rotate(-10 9 6)" /><rect x="12.5" y="3.5" width="4.5" height="4.5" rx="1" transform="rotate(12 15 6)" /><path d="M9 13v4M12 13v5M15 13v4" /></>),
  bell: (<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" fill={A} fillOpacity=".3" /><path d="M10 20.5a2 2 0 0 0 4 0M12 3v2" /></>),
  basket: (<><path d="M3.5 10h17l-1.6 8.4a2 2 0 0 1-2 1.6H7.1a2 2 0 0 1-2-1.6z" fill={A} fillOpacity=".3" /><path d="M8 10l3-6M16 10l-3-6M9 14v2.5M12 14v2.5M15 14v2.5" /></>),
  beer: (<><path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill={A} fillOpacity=".4" /><path d="M15 11h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2M4.5 8a2.5 2.5 0 0 1 2.5-3 3 3 0 0 1 5.5 0 2.5 2.5 0 0 1 3 3M8.5 12v5M11.5 12v5" /></>),
  key: (<><circle cx="8" cy="15" r="4" fill={A} fillOpacity=".35" /><path d="M11 12l8-8M16 7l2 2M14 9l1.5 1.5" /></>),
  moon: (<><path d="M19 15.5A8 8 0 0 1 8.5 5a8 8 0 1 0 10.5 10.5z" fill={A} fillOpacity=".35" /><path d="M17 4v3M15.5 5.5h3" /></>),
  pig: (<><ellipse cx="12" cy="13" rx="7.5" ry="6" fill={A} fillOpacity=".3" /><ellipse cx="12" cy="14.5" rx="2.6" ry="1.8" /><path d="M6.5 8.5L5 5l3.5 2M17.5 8.5L19 5l-3.5 2M8 19v1.5M16 19v1.5" /><circle cx="9.3" cy="11.3" r=".6" fill="currentColor" /><circle cx="14.7" cy="11.3" r=".6" fill="currentColor" /></>),
  user: (<><circle cx="12" cy="8.5" r="4" fill={A} fillOpacity=".35" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>),
  lantern: (<><path d="M12 2v2M9 4h6M8 20h8M12 20v2" /><path d="M7 7a5 5 0 0 1 10 0v8a5 5 0 0 1-10 0z" fill={A} fillOpacity=".35" /><path d="M7 4h10M7 18h10" /></>),
  chef: (<><path d="M7 13.5a4 4 0 0 1-1-7.8 4.5 4.5 0 0 1 8.5-1.5A4 4 0 0 1 17 13.5V19H7z" fill={A} fillOpacity=".3" /><path d="M7 16h10" /></>),
  qr: (<><rect x="4" y="4" width="6" height="6" rx="1" fill={A} fillOpacity=".4" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 14h2M14 18v2h2M18 18h2v2" /></>),
  logout: (<><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M14 8l4 4-4 4M18 12H9" /></>),
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" fill={A} fillOpacity=".4" /></>),
  eyeOff: (<><path d="M4 4l16 16M9.9 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.6 7.2A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  up: (<path d="M6 15l6-6 6 6" />),
  down: (<path d="M6 9l6 6 6-6" />),
  pencil: (<><path d="M4 20l1-4L16 5l3 3L8 19z" fill={A} fillOpacity=".3" /><path d="M14 7l3 3" /></>),
}

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`ico ${className ?? ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  )
}
