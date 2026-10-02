import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import type { Sql } from "@/lib/db"

const loginNumber = z.string().regex(/^\d{4,12}$/)
const COOKIE = "aviator-predictor-access"

function digits(value: string) {
  return value.replace(/\D/g, "").slice(0, 12)
}

async function ensureConfirmed(sql: Sql) {
  await sql`
    create table if not exists confirmed_logins (
      login_number text primary key,
      confirmed_at timestamptz not null default now()
    )
  `
}

async function isConfirmed(sql: Sql, login: string) {
  if (!/^\d{4,12}$/.test(login)) return false
  await ensureConfirmed(sql)
  const marked = await sql<{ ok: number }>`
    select 1 as ok from confirmed_logins where login_number = ${login} limit 1
  `
  return marked.length > 0
}

async function deskPass(token: string) {
  const origin = (process.env.AVIATION_ORIGIN || "https://aviatorsignalhack.com").replace(/\/$/, "")
  try {
    const response = await fetch(`${origin}/api/desk-pass?token=${token}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return { ok: false as const, login: "" }
    const body = (await response.json()) as { ok?: boolean; login?: string }
    if (body.ok !== true) return { ok: false as const, login: "" }
    const login = digits(typeof body.login === "string" ? body.login : "")
    return { ok: true as const, login: /^\d{4,12}$/.test(login) ? login : "" }
  } catch {
    return { ok: false as const, login: "" }
  }
}

function expectedCode() {
  const raw = process.env.PREDICTOR_ACCESS_CODE || process.env.ACCESS_CODE || ""
  return raw.replace(/\D/g, "").slice(0, 8)
}

function sameCode(entered: string, expected: string) {
  if (entered.length < 4 || entered.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < entered.length; i += 1) mismatch |= entered.charCodeAt(i) ^ expected.charCodeAt(i)
  return mismatch === 0
}

export const accessStatus = createServerFn({ method: "GET" })
  .validator(z.object({ loginNumber: z.string().optional(), pass: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const { getCookie } = await import("@tanstack/react-start/server")
    if (getCookie(COOKIE) === "1") return { ok: true as const, login: "" }
    const pass = (data?.pass ?? "").trim()
    if (/^[a-f0-9]{32}$/.test(pass)) {
      const opened = await deskPass(pass)
      if (opened.ok) return { ok: true as const, login: opened.login }
    }
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    const login = digits(data?.loginNumber ?? "")
    const confirmed = await isConfirmed(sql, login)
    return { ok: confirmed, login: confirmed ? login : "" }
  })

export const submitAccessCode = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().regex(/^\d{4,8}$/) }))
  .handler(async ({ data }) => {
    const expected = expectedCode()
    if (!sameCode(data.code, expected)) return { ok: false as const }
    const { setCookie } = await import("@tanstack/react-start/server")
    setCookie(COOKIE, "1", { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 })
    return { ok: true as const }
  })

async function adminMatches(sql: Sql, adminNumber: string) {
  const existing = await sql<{ login_number: string }>`select login_number from admin_access where id = 1`
  return existing.length > 0 && existing[0].login_number === adminNumber
}

export const confirmVisitor = createServerFn({ method: "POST" })
  .validator(z.object({ adminNumber: loginNumber, visitorNumber: loginNumber }))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    if (!(await adminMatches(sql, data.adminNumber))) return { ok: false as const }
    await ensureConfirmed(sql)
    await sql`
      insert into confirmed_logins (login_number)
      values (${data.visitorNumber})
      on conflict (login_number) do nothing
    `
    return { ok: true as const }
  })
