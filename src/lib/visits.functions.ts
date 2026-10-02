import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const loginNumber = z.string().regex(/^\d{4,12}$/)

export const recordVisit = createServerFn({ method: "POST" })
  .validator(z.object({ loginNumber }))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    await sql`insert into visits (login_number) values (${data.loginNumber})`
    return { ok: true as const }
  })

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db")
  const sql = await getSql()
  const rows = await sql<{ ok: number }>`select 1 as ok from admin_access where id = 1`
  return { claimed: rows.length > 0 }
})

export const claimAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ adminNumber: loginNumber }))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    const existing = await sql<{ login_number: string }>`select login_number from admin_access where id = 1`
    if (existing.length > 0) return { ok: false as const, reason: "taken" as const }
    await sql`insert into admin_access (id, login_number) values (1, ${data.adminNumber})`
    return { ok: true as const }
  })

export const adminReport = createServerFn({ method: "POST" })
  .validator(z.object({ adminNumber: loginNumber }))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    const existing = await sql<{ login_number: string }>`select login_number from admin_access where id = 1`
    if (existing.length === 0 || existing[0].login_number !== data.adminNumber) {
      return { ok: false as const }
    }
    await sql`
      create table if not exists confirmed_logins (
        login_number text primary key,
        confirmed_at timestamptz not null default now()
      )
    `
    const rows = await sql<{ login_number: string; visits: number; confirmed: boolean }>`
      select v.login_number, count(*)::int as visits,
        exists(select 1 from confirmed_logins c where c.login_number = v.login_number) as confirmed
      from visits v
      group by v.login_number
      order by visits desc, v.login_number asc
    `
    const total = rows.reduce((sum, row) => sum + Number(row.visits), 0)
    return {
      ok: true as const,
      total,
      rows: rows.map((row) => ({
        login_number: row.login_number,
        visits: Number(row.visits),
        confirmed: row.confirmed === true || String(row.confirmed) === "t" || String(row.confirmed) === "true",
      })),
    }
  })
