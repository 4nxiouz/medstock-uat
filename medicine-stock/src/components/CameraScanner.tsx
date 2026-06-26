import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type CameraScannerProps = {
    open: boolean
    onClose: () => void
    onScan: (barcode: string) => void
}

function CameraScanner({ open, onClose, onScan }: CameraScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) {
            return
        }

        let stream: MediaStream | null = null
        let frameId = 0
        let active = true

        async function startScanner() {
            setError('')

            if (!('BarcodeDetector' in window)) {
                setError('Camera scan needs Chrome on Android or Safari 17+. Use Bluetooth scanner or type manually.')
                return
            }

            try {
                const detector = new BarcodeDetector({
                    formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'qr_code'],
                })

                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false,
                })

                const video = videoRef.current
                if (!video || !active) {
                    return
                }

                video.srcObject = stream
                await video.play()

                const scanFrame = async () => {
                    if (!active || !videoRef.current) {
                        return
                    }

                    try {
                        const barcodes = await detector.detect(videoRef.current)
                        const value = barcodes[0]?.rawValue?.trim()

                        if (value) {
                            onScan(value)
                            stopScanner()
                            onClose()
                            return
                        }
                    } catch {
                        // keep scanning
                    }

                    frameId = window.requestAnimationFrame(() => {
                        void scanFrame()
                    })
                }

                void scanFrame()
            } catch {
                if (active) {
                    setError('Cannot open camera. Allow camera permission or use manual input.')
                }
            }
        }

        function stopScanner() {
            window.cancelAnimationFrame(frameId)
            stream?.getTracks().forEach((track) => track.stop())
            stream = null

            if (videoRef.current) {
                videoRef.current.srcObject = null
            }
        }

        void startScanner()

        return () => {
            active = false
            stopScanner()
        }
    }, [open, onClose, onScan])

    if (!open) {
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
            <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Camera className="size-4" />
                        Scan with camera
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="bg-slate-950 p-3">
                    <video
                        ref={videoRef}
                        className="aspect-[4/3] w-full rounded-lg object-cover"
                        playsInline
                        muted
                    />
                </div>

                {error && (
                    <div className="border-t border-slate-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                    Point the camera at a barcode. HTTPS required on mobile browsers.
                </div>
            </div>
        </div>
    )
}

export default CameraScanner
