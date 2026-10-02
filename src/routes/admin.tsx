import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { adminReport, adminStatus, claimAdmin } from "@/lib/visits.functions"

export const Route = createFileRoute("/admin")({
  component: AdminPage,
})

type Row = { login_number: string; visits: number }

function AdminPage() {
  const [claimed, setClaimed] = useState<boolean | null>(null)
  const [adminNumber, setAdminNumber] = useState("")
  const [error, setError] = useState("")
  const [total, setTotal] = useState<number | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancel = false
    adminStatus()
      .then((status) => {
        if (!cancel) setClaimed(status.claimed)
      })
      .catch(() => {
        if (!cancel) setError("The visit record could not be opened.")
      })
    return () => {
      cancel = true
    }
  }, [])

  async function onClaim() {
    setError("")
    setPending(true)
    try {
      const result = await claimAdmin({ data: { adminNumber } })
      if (!result.ok) {
        setError("An admin number is already set.")
        setClaimed(true)
        return
      }
      setClaimed(true)
      await load()
    } catch {
      setError("Use 4 to 12 digits.")
    } finally {
      setPending(false)
    }
  }

  async function load() {
    setError("")
    setPending(true)
    try {
      const result = await adminReport({ data: { adminNumber } })
      if (!result.ok) {
        setRows(null)
        setTotal(null)
        setError("That is not the admin number.")
        return
      }
      setTotal(result.total)
      setRows(result.rows)
    } catch {
      setError("Use 4 to 12 digits.")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-dvh bg-[url('/next-odds-bg.jpg')] bg-cover bg-center px-5 py-8 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <Link to="/" className="text-sm text-white/70">
            Back
          </Link>
        </div>
        <p className="mt-2 text-sm text-white/60">
          Visit counts and login numbers stay on this page. Visitors cannot see this list.
        </p>

        <label className="mt-6 block text-sm text-white/70" htmlFor="admin-number">
          Admin number
        </label>
        <input
          id="admin-number"
          inputMode="numeric"
          autoComplete="off"
          value={adminNumber}
          onChange={(event) => setAdminNumber(event.target.value.replace(/\D/g, "").slice(0, 12))}
          className="mt-2 h-12 w-full rounded-full bg-white/10 px-4 font-mono text-lg outline-none"
        />

        {claimed === false ? (
          <button
            type="button"
            disabled={pending || adminNumber.length < 4}
            onClick={onClaim}
            className="mt-4 h-12 w-full rounded-full bg-white text-sm font-semibold text-[#111] disabled:opacity-50"
          >
            Set this admin number
          </button>
        ) : (
          <button
            type="button"
            disabled={pending || claimed === null || adminNumber.length < 4}
            onClick={load}
            className="mt-4 h-12 w-full rounded-full bg-white text-sm font-semibold text-[#111] disabled:opacity-50"
          >
            Show visits
          </button>
        )}

        {claimed === false ? (
          <p className="mt-3 text-sm text-white/50">
            No admin is set yet. The first number saved here is the only one that can open this list. Keep it.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-[#ffb4a8]">{error}</p> : null}

        {rows ? (
          <section className="mt-8">
            <p className="text-sm text-white/60">Total visits</p>
            <p className="font-mono text-4xl">{total}</p>
            <ul className="mt-4 divide-y divide-white/10">
              {rows.length === 0 ? (
                <li className="py-4 text-sm text-white/50">No visits yet.</li>
              ) : (
                rows.map((row) => (
                  <li key={row.login_number} className="flex items-center justify-between py-3">
                    <span className="font-mono text-lg">{row.login_number}</span>
                    <span className="text-sm text-white/70">{row.visits} visits</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  )
}
