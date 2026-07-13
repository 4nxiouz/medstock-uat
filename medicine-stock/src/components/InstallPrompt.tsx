import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    if (!deferredPrompt || dismissed) return null

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
            <button
                onClick={() => setDismissed(true)}
                className="shrink-0 text-teal-400 hover:text-white transition"
            >
                <X className="size-4" />
            </button>
        </div>
    )
}
