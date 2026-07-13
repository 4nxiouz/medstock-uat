import { Download, Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
    return ('standalone' in navigator) && (navigator as Navigator & { standalone: boolean }).standalone
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [showIos, setShowIos] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        // Android Chrome
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }
        window.addEventListener('beforeinstallprompt', handler)

        // iOS Safari — show only if not already installed
        if (isIos() && !isInStandaloneMode()) {
            setShowIos(true)
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    if (dismissed) return null

    // iOS banner
    if (showIos && !deferredPrompt) {
        return (
            <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-teal-800 p-4 shadow-2xl animate-slide-up lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
                <div className="flex items-start gap-3">
                    <img src="/icon.svg" className="size-10 shrink-0 rounded-xl" alt="" />
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm">ติดตั้ง MedStock บน iPhone</div>
                        <div className="mt-1 text-xs text-teal-200 leading-relaxed">
                            กด <Share className="inline size-3.5 mb-0.5" /> แล้วเลือก
                            <span className="mx-1 rounded bg-teal-700 px-1.5 py-0.5 font-medium">Add to Home Screen</span>
                        </div>
                    </div>
                    <button onClick={() => setDismissed(true)} className="shrink-0 text-teal-400 hover:text-white mt-0.5">
                        <X className="size-4" />
                    </button>
                </div>
            </div>
        )
    }

    // Android Chrome banner
    if (!deferredPrompt) return null

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-teal-800 p-4 shadow-2xl animate-slide-up lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-700">
                <img src="/icon.svg" className="size-7" alt="" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">ติดตั้ง MedStock</div>
                <div className="mt-0.5 text-xs text-teal-200">เพิ่มลง home screen ใช้ได้เหมือน app</div>
            </div>
            <button
                onClick={async () => {
                    await deferredPrompt.prompt()
                    setDeferredPrompt(null)
                }}
                className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 flex items-center gap-1.5 transition active:scale-95"
            >
                <Download className="size-3.5" />
                ติดตั้ง
            </button>
            <button onClick={() => setDismissed(true)} className="shrink-0 text-teal-400 hover:text-white transition">
                <X className="size-4" />
            </button>
        </div>
    )
}
