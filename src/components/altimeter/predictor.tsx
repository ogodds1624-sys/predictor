import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Check, PictureInPicture2, Wallet, X } from "lucide-react"
import { recordVisit } from "@/lib/visits.functions"

const STORAGE_KEY = "aviator-predictor-v1"
const LOGIN_KEY = "aviator-login-number"

type RecordRow = {
  id: number
  coefficient: number
  at: number
}

type Saved = {
  current: number
  nextId: number
  rows: RecordRow[]
  startedAt: number
  auto: boolean
}

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Saved
    if (!Number.isFinite(parsed.current) || !Array.isArray(parsed.rows)) return null
    return parsed
  } catch {
    return null
  }
}

function formatCoef(n: number): string {
  if (n >= 1000) return `${Math.round(n).toLocaleString("en-US")}x`
  return `${n.toFixed(2)}x`
}

function sampleOdds() {
  const pool = new Set<number>()
  while (pool.size < 50) {
    pool.add((100 + Math.floor(Math.random() * 1901)) / 100)
  }
  return [...pool]
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hh = String(Math.floor(total / 3600)).padStart(2, "0")
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0")
  const ss = String(total % 60).padStart(2, "0")
  return `${hh} : ${mm} : ${ss}`
}

export function Predictor() {
  const [current, setCurrent] = useState(1)
  const [nextId, setNextId] = useState(1)
  const [rows, setRows] = useState<RecordRow[]>([])
  const [arranged, setArranged] = useState<number[]>([])
  const [startedAt, setStartedAt] = useState(0)
  const [now, setNow] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [loginNumber, setLoginNumber] = useState("")
  const [flash, setFlash] = useState(0)
  const [signalLocked, setSignalLocked] = useState(true)
  const [lockRun, setLockRun] = useState(0)
  const [inPip, setInPip] = useState(false)
  const nextIdRef = useRef(1)
  const rowsRef = useRef<RecordRow[]>([])
  const queueRef = useRef<number[]>([])
  const pipWindowRef = useRef<Window | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const coefRef = useRef("1.00x")
  const openPipRef = useRef<() => void>(() => {})
  const closePipRef = useRef<() => void>(() => {})

  function openWallet() {
    setWalletOpen(true)
  }

  function remember(coefficient: number) {
    const full = rowsRef.current.length >= 10
    const id = full ? 1 : nextIdRef.current
    nextIdRef.current = id + 1
    const next = full
      ? [{ id, coefficient, at: Date.now() }]
      : [{ id, coefficient, at: Date.now() }, ...rowsRef.current]
    rowsRef.current = next
    setNextId(nextIdRef.current)
    setRows(next)
  }

  function saveLoginNumber() {
    const next = loginNumber.replace(/\D/g, "").slice(0, 12)
    if (next.length < 4) return
    localStorage.setItem(LOGIN_KEY, next)
    setLoginNumber(next)
    recordVisit({ data: { loginNumber: next } })
      .then(() => sessionStorage.setItem("aviator-visit-marked", next))
      .catch(() => {})
  }

  function nextSignal() {
    if (signalLocked || inPip) return
    const queue = queueRef.current
    if (queue.length === 0) {
      openWallet()
    } else {
      const coefficient = queue[Math.floor(Math.random() * queue.length)]
      setCurrent(coefficient)
      setFlash((count) => count + 1)
      remember(coefficient)
    }
    setSignalLocked(true)
    setLockRun((count) => count + 1)
  }

  useEffect(() => {
    const id = window.setTimeout(() => setSignalLocked(false), 10000)
    return () => window.clearTimeout(id)
  }, [lockRun])

  useEffect(() => {
    if (!inPip) return
    const id = window.setInterval(() => {
      const queue = queueRef.current
      if (queue.length === 0) return
      const coefficient = queue[Math.floor(Math.random() * queue.length)]
      setCurrent(coefficient)
      setFlash((count) => count + 1)
      remember(coefficient)
    }, 10000)
    return () => window.clearInterval(id)
  }, [inPip])

  useEffect(() => {
    const saved = loadSaved()
    if (saved && saved.rows.length < 10) {
      setCurrent(saved.current)
      setNextId(saved.nextId)
      nextIdRef.current = saved.nextId
      const kept = saved.rows.slice(0, 9)
      rowsRef.current = kept
      setRows(kept)
      setStartedAt(saved.startedAt)
    } else {
      const opened = Date.now()
      setStartedAt(opened)
      setCurrent(1)
    }
    const starter = sampleOdds()
    const first = starter[Math.floor(Math.random() * starter.length)]
    queueRef.current = starter
    setArranged(starter)
    setCurrent(first)
    remember(first)
    setFlash((count) => count + 1)
    const savedLogin = localStorage.getItem(LOGIN_KEY) ?? ""
    setLoginNumber(savedLogin.replace(/\D/g, "").slice(0, 12))
    if (savedLogin && sessionStorage.getItem("aviator-visit-marked") !== savedLogin) {
      recordVisit({ data: { loginNumber: savedLogin } })
        .then(() => sessionStorage.setItem("aviator-visit-marked", savedLogin))
        .catch(() => {})
    }
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (!startedAt) return
    const payload: Saved = { current, nextId, rows, startedAt, auto: false }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [current, nextId, rows, startedAt])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const coefLabel = formatCoef(current)
  const coefSize = coefLabel.length > 7 ? "text-3xl" : "text-5xl"
  coefRef.current = coefLabel

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let frame = 0
    const draw = (now = performance.now()) => {
      const w = canvas.width
      const h = canvas.height
      const t = now / 1000
      ctx.fillStyle = "#070b12"
      ctx.fillRect(0, 0, w, h)
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(t * 0.28)
      for (let i = 0; i < 24; i++) {
        ctx.rotate((Math.PI * 2) / 24)
        ctx.fillStyle = i % 2 === 0 ? "#16324c" : "#070b12"
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(w, -48)
        ctx.lineTo(w, 48)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      const glow = ctx.createRadialGradient(w * 0.62, h * 0.42, 8, w * 0.5, h * 0.5, w * 0.55)
      glow.addColorStop(0, "rgba(56, 112, 168, 0.55)")
      glow.addColorStop(1, "rgba(7, 11, 18, 0)")
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)
      const pulse = (t % 1.8) / 1.8
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, 80 + pulse * 110, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(57, 255, 20, ${0.85 - pulse * 0.85})`
      ctx.lineWidth = 5
      ctx.stroke()
      ctx.fillStyle = "#ffffff"
      ctx.font = "700 84px system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(coefRef.current, w / 2, h / 2 + Math.sin(t * 1.15) * 8)
    }

    const paint = (pip: Window) => {
      const doc = pip.document
      const existing = doc.getElementById("pip-odds")
      if (existing) {
        existing.textContent = coefRef.current
        return
      }
      doc.head.replaceChildren()
      const style = doc.createElement("style")
      style.textContent = `
        html, body { height: 100%; margin: 0; }
        body { position: relative; overflow: hidden; background: #070b12; }
        .rays {
          position: absolute; inset: -20%;
          background:
            radial-gradient(ellipse at 62% 42%, rgba(56, 112, 168, 0.55), transparent 58%),
            repeating-conic-gradient(from 0deg at 50% 50%, #070b12 0deg 8deg, #16324c 8deg 16deg);
          animation: spin 16s linear infinite;
        }
        .ring {
          position: absolute; inset: 18%;
          border: 3px solid #39ff14;
          border-radius: 999px;
          box-shadow: 0 0 18px #39ff14;
          animation: ping 1.8s ease-out infinite;
        }
        #pip-odds {
          position: relative; z-index: 2; margin: 0;
          color: #fff; font: 700 64px system-ui, sans-serif;
          animation: float 5.5s ease-in-out infinite;
          text-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping {
          0% { transform: scale(0.7); opacity: 0.95; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `
      doc.head.append(style)
      const rays = doc.createElement("div")
      rays.className = "rays"
      const ring = doc.createElement("div")
      ring.className = "ring"
      const label = doc.createElement("p")
      label.id = "pip-odds"
      label.textContent = coefRef.current
      doc.body.replaceChildren(rays, ring, label)
    }

    frame = requestAnimationFrame(function loop(now: number) {
      draw(now)
      frame = requestAnimationFrame(loop)
    })
    if (pipWindowRef.current) paint(pipWindowRef.current)
    if (!video.srcObject) {
      const stream = canvas.captureStream(30)
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        const audio = new AudioCtx()
        audioRef.current = audio
        const dest = audio.createMediaStreamDestination()
        const tone = audio.createOscillator()
        const gain = audio.createGain()
        gain.gain.value = 0.0001
        tone.connect(gain)
        gain.connect(dest)
        tone.start()
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track))
      }
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      video.disablePictureInPicture = false
      ;(video as HTMLVideoElement & { autoPictureInPicture?: boolean }).autoPictureInPicture = true
      video.play().catch(() => {})
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: coefRef.current,
        artist: "AVIATOR PREDICTOR",
      })
      try {
        navigator.mediaSession.setActionHandler("enterpictureinpicture", async () => {
          if (document.pictureInPictureEnabled) await video.requestPictureInPicture()
        })
      } catch {
        // This browser does not offer a picture-in-picture action.
      }
    }

    const onEnter = () => setInPip(true)
    const onLeave = () => {
      if (!pipWindowRef.current) setInPip(false)
    }
    video.addEventListener("enterpictureinpicture", onEnter)
    video.addEventListener("leavepictureinpicture", onLeave)

    const enter = async () => {
      if (pipWindowRef.current || document.pictureInPictureElement) {
        setInPip(true)
        return
      }
      const api = (window as Window & {
        documentPictureInPicture?: {
          requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>
        }
      }).documentPictureInPicture
      if (api) {
        try {
          const pip = await api.requestWindow({ width: 420, height: 240 })
          pipWindowRef.current = pip
          paint(pip)
          setInPip(true)
          pip.addEventListener("pagehide", () => {
            pipWindowRef.current = null
            setInPip(false)
          })
          return
        } catch {
          // Browser blocked the window. The video fallback can still open.
        }
      }
      try {
        await video.play()
        const webkit = video as HTMLVideoElement & {
          webkitSupportsPresentationMode?: (mode: string) => boolean
          webkitSetPresentationMode?: (mode: string) => void
        }
        if (webkit.webkitSupportsPresentationMode?.("picture-in-picture")) {
          webkit.webkitSetPresentationMode?.("picture-in-picture")
          return
        }
        if (document.pictureInPictureEnabled) await video.requestPictureInPicture()
      } catch {
        // The phone can still offer its own picture-in-picture prompt.
      }
    }

    const leave = async () => {
      pipWindowRef.current?.close()
      pipWindowRef.current = null
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture().catch(() => {})
      }
      setInPip(false)
    }

    const onHide = () => {
      if (document.visibilityState === "hidden") void enter()
      else void leave()
    }
    const arm = () => {
      audioRef.current?.resume().catch(() => {})
      video.muted = false
      video.volume = 0.01
      video.play().catch(() => {})
    }
    openPipRef.current = () => {
      void enter()
    }
    closePipRef.current = () => {
      void leave()
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", enter)
    window.addEventListener("pointerdown", arm)

    return () => {
      cancelAnimationFrame(frame)
      video.removeEventListener("enterpictureinpicture", onEnter)
      video.removeEventListener("leavepictureinpicture", onLeave)
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", enter)
      window.removeEventListener("pointerdown", arm)
    }
  }, [coefLabel])

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-white text-[#1c1c1c]">
      <canvas ref={canvasRef} width={640} height={360} className="pointer-events-none fixed top-0 -left-[999px] h-px w-px" aria-hidden="true" />
      <video ref={videoRef} muted playsInline className="pointer-events-none fixed top-0 -left-[999px] h-px w-px" aria-hidden="true" />
      <header
        className="relative px-5 pt-5 pb-14 text-white"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 62% 42%, rgba(56, 112, 168, 0.55), transparent 58%), repeating-conic-gradient(from 208deg at 0% 100%, #070b12 0deg 7deg, #16324c 7deg 14deg, #0c1828 14deg 21deg)",
          borderBottomLeftRadius: "50% 42px",
          borderBottomRightRadius: "50% 42px",
        }}
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            aria-label="Picture in picture"
            onClick={() => (inPip ? closePipRef.current() : openPipRef.current())}
            className="grid size-10 place-items-center"
          >
            <PictureInPicture2 className="size-6" strokeWidth={2.25} />
          </button>
          <PlaneMark />
          <span aria-hidden="true" className="pointer-events-none grid size-10 place-items-center">
            <Wallet className="size-6" strokeWidth={2} />
          </span>
        </div>
        <h1 className="mt-3 px-2 text-center font-[family-name:var(--font-display)] text-[clamp(1.35rem,5vw,2.15rem)] leading-none font-extrabold tracking-[0.12em] whitespace-nowrap text-[#e8012f]">
          AVIATOR PREDICTOR
        </h1>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-2">
        <div className="coef-stage relative grid size-72 place-items-center sm:size-80">
          <span className="ping ping-a" aria-hidden="true" />
          <span className="ping ping-b" aria-hidden="true" />
          <span className="ping ping-c" aria-hidden="true" />
          <span className="dash-ring" aria-hidden="true" />
          <span className="scanline" aria-hidden="true" />
          {flash > 0 ? <span key={flash} className="coef-flash" aria-hidden="true" /> : null}
          <div className="relative z-10 grid size-56 place-items-center overflow-hidden rounded-full bg-[url('/next-odds-bg.jpg')] bg-cover bg-center shadow-[0_0_32px_rgba(0,0,0,0.45)] sm:size-60">
            <div className="text-center">
              <p className={`coef-float font-semibold tracking-tight text-white ${coefSize}`}>{coefLabel}</p>
              <p className="mt-1 text-sm text-white/70">Predicted coefficient</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={nextSignal}
          disabled={signalLocked || inPip}
          className={`mt-8 w-full max-w-xs rounded-full bg-[url('/next-odds-bg.jpg')] bg-cover bg-center py-4 text-lg font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.45)] ${signalLocked || inPip ? "cursor-not-allowed opacity-60" : ""}`}
        >
          Next signal
        </button>
        <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-black/10" aria-hidden="true">
          {signalLocked ? <div key={lockRun} className="signal-load" /> : null}
        </div>
      </main>

      <section className="mt-auto bg-[url('/next-odds-bg.jpg')] bg-cover bg-center px-4 pt-16 pb-8 text-white [border-top-left-radius:50%_48px] [border-top-right-radius:50%_48px]">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-4 flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-sm font-medium text-white/80">Signal record</h2>
            <p className="text-xs text-white/45">{rows.length} saved</p>
          </div>
          {rows.length === 0 ? (
            <p className="mb-4 px-1 text-sm text-white/50">Tap Next signal. Each shown coefficient is saved here.</p>
          ) : (
            <ul className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {rows.slice(0, 8).map((row) => (
                <li
                  key={row.id}
                  className="shrink-0 rounded-full bg-white/10 px-3 py-1 font-mono text-sm text-white"
                >
                  {formatCoef(row.coefficient)}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#1c1c1e] px-4 py-4">
            <p className="font-mono text-lg text-white/90">{formatCoef(current)}</p>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-sm font-medium text-[#3ddc84]">
                <Check className="size-4" strokeWidth={3} />
                Connected
              </p>
              <p className="mt-1 font-mono text-sm tracking-wide text-white/80">
                {formatClock(startedAt ? now - startedAt : 0)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {walletOpen ? (
        <div className="fixed inset-0 z-20 flex flex-col bg-[url('/next-odds-bg.jpg')] bg-cover bg-center text-white">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-lg font-semibold">Wallet</h2>
            <button type="button" aria-label="Close" onClick={() => setWalletOpen(false)} className="grid size-10 place-items-center">
              <X className="size-6" />
            </button>
          </div>
          <p className="px-5 text-sm text-white/50">
            These odds are chosen at random. Next signal picks one. They cannot be typed in.
          </p>
          <p className="px-5 pt-4 font-mono text-3xl font-semibold">{coefLabel}</p>
          <label className="mt-4 block px-5 text-sm text-white/60" htmlFor="login-number">
            Login number
          </label>
          <div className="mt-2 flex gap-2 px-5">
            <input
              id="login-number"
              inputMode="numeric"
              autoComplete="off"
              value={loginNumber}
              onChange={(event) => setLoginNumber(event.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="Your number"
              className="h-12 min-w-0 flex-1 rounded-full bg-white/10 px-4 font-mono text-base outline-none placeholder:text-white/30"
            />
            <button
              type="button"
              onClick={saveLoginNumber}
              className="h-12 shrink-0 rounded-full bg-white px-4 text-sm font-semibold text-[#111]"
            >
              Save
            </button>
          </div>
          <ul className="mt-4 flex-1 divide-y divide-white/10 overflow-y-auto">
            {arranged.length === 0 ? (
              <li className="px-5 py-6 text-sm text-white/50">No odds arranged yet.</li>
            ) : (
              arranged.map((coefficient, index) => (
                <li key={`${coefficient}-${index}`} className="flex items-center justify-between px-5 py-3">
                  <span className="font-mono text-sm text-white/45">#{index + 1}</span>
                  <span className="font-mono text-lg">{formatCoef(coefficient)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-20 flex flex-col bg-[url('/next-odds-bg.jpg')] bg-cover bg-center text-white">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-lg font-semibold">Signal record</h2>
            <button type="button" aria-label="Close" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center">
              <X className="size-6" />
            </button>
          </div>
          <p className="px-5 text-sm text-white/50">
            Paper coefficients from this session. Not a casino feed, and not a guarantee.
          </p>
          <ul className="mt-4 flex-1 divide-y divide-white/10 overflow-y-auto">
            {rows.length === 0 ? (
              <li className="px-5 py-6 text-sm text-white/50">No coefficients saved yet.</li>
            ) : (
              rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between px-5 py-3">
                  <span className="font-mono text-sm text-white/45">#{row.id}</span>
                  <span className="font-mono text-lg">{formatCoef(row.coefficient)}</span>
                </li>
              ))
            )}
          </ul>
          <Link to="/admin" className="px-5 py-4 text-sm text-white/50">
            Admin
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function PlaneMark() {
  return <img src="/plane.png" alt="" className="float-loop h-12 w-auto" />
}
