import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { accessStatus, submitAccessCode } from "@/lib/access.functions"

const LOGIN_KEY = "aviator-login-number"

function savedLogin() {
  const fromUrl = new URLSearchParams(window.location.search).get("login") ?? ""
  let stored = ""
  try {
    stored = window.localStorage.getItem(LOGIN_KEY) ?? ""
  } catch {
    stored = ""
  }
  return (fromUrl || stored).replace(/\D/g, "").slice(0, 12)
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [wrong, setWrong] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const loginNumber = savedLogin()
    const pass = params.get("pass") ?? ""
    let cancel = false
    void accessStatus({ data: { loginNumber, pass } })
      .then((result) => {
        if (cancel) return
        const login = result.login || loginNumber
        if (result.ok && login) {
          try {
            window.localStorage.setItem(LOGIN_KEY, login)
          } catch {
            // The visit can continue without storing the number.
          }
        }
        setOpen(result.ok)
      })
      .catch(() => {
        if (!cancel) setOpen(false)
      })
      .finally(() => {
        if (!cancel) setReady(true)
      })
    return () => {
      cancel = true
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setWrong(false)
    try {
      const result = await submitAccessCode({ data: { code } })
      if (!result.ok) {
        setWrong(true)
        return
      }
      setOpen(true)
    } catch {
      setWrong(true)
    } finally {
      setPending(false)
    }
  }

  if (!ready) return <div className="min-h-dvh bg-white" />
  if (open) return children
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-[#1c1c1c]">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[0.12em] text-[#e8012f]">
        AVIATOR PREDICTOR
      </h1>
      <p className="mt-3 text-sm text-black/60">Enter the access code to continue.</p>
      <form onSubmit={onSubmit} className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <input
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={code}
          aria-label="Access code"
          placeholder="Access code"
          onChange={(event) => {
            setWrong(false)
            setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
          }}
          className="h-12 rounded-full border border-black/10 bg-white px-4 text-center font-mono text-lg outline-none"
        />
        <button
          type="submit"
          disabled={pending || code.length < 4}
          className="h-12 rounded-full bg-[#e8012f] text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Checking..." : "Enter"}
        </button>
        {wrong ? <p className="text-center text-sm text-[#e8012f]">Wrong access code.</p> : null}
      </form>
    </main>
  )
}
