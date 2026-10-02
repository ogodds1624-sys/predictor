export const HOUSE_EDGE = 0.03
export const START_BANK = 1000
export const BET_SECONDS = 5.5
export const CRASH_HOLD = 2.4
export const FLIGHT_K = 0.38
export const STORAGE_KEY = "altimeter-desk-v1"

export type Mode = "conservative" | "balanced" | "aggressive"
export type Phase = "betting" | "flying" | "crashed"
export type SignalAction = "TAKE" | "SKIP" | "WAIT"

export type HistRound = {
  id: number
  crash: number
  live: boolean
}

export type LogResult = "hit" | "miss" | "passed" | "flat"

export type LogEntry = {
  id: number
  crash: number
  action: SignalAction
  target: number
  followed: boolean
  staked: number
  cashout: number | null
  result: LogResult
  pnl: number
}

export type Signal = {
  action: SignalAction
  target: number
  hitRate: number
  sample: number
  ev: number
  fair: number
  reason: string
  stakePct: number
}

export type Bet = {
  stake: number
  cashout: number
  fromSignal: boolean
}

export type Sim = {
  bankroll: number
  peak: number
  mode: Mode
  auto: boolean
  pace: 1 | 3
  stake: number
  phase: Phase
  phaseLeft: number
  flightT: number
  multiplier: number
  crashPoint: number
  roundId: number
  history: HistRound[]
  signal: Signal
  bet: Bet | null
  log: LogEntry[]
}

export type Persisted = {
  bankroll: number
  peak: number
  mode: Mode
  auto: boolean
  pace: 1 | 3
  stake: number
  roundId: number
  history: HistRound[]
  log: LogEntry[]
}

const LADDERS: Record<Mode, number[]> = {
  conservative: [1.2, 1.3, 1.4, 1.5, 1.6, 1.8],
  balanced: [1.25, 1.5, 1.8, 2, 2.5, 3.5],
  aggressive: [1.5, 2, 3, 5, 8, 15],
}

const FLOOR: Record<Mode, number> = {
  conservative: 0,
  balanced: -0.03,
  aggressive: -1,
}

const STAKE_PCT: Record<Mode, number> = {
  conservative: 0.01,
  balanced: 0.02,
  aggressive: 0.03,
}

export function randomUnit(): number {
  const buf = new Uint32Array(2)
  crypto.getRandomValues(buf)
  const hi = buf[0] & 0x001fffff
  return (hi * 4294967296 + buf[1]) / 9007199254740992
}

/** Aviator-style crash with a 3% edge. Independent of prior rounds. */
export function crashFromUnit(r: number): number {
  const u = Math.min(0.999999999, Math.max(0, r))
  const raw = (1 - HOUSE_EDGE) / (1 - u)
  return Math.max(1, Math.floor(raw * 100) / 100)
}

export function sampleCrashPoint(): number {
  return crashFromUnit(randomUnit())
}

export function fairChance(multiplier: number): number {
  if (multiplier <= 1) return 1
  return Math.min(1, (1 - HOUSE_EDGE) / multiplier)
}

function money(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatUnits(n: number, signed = false): string {
  const neg = n < -0.001
  const pos = n > 0.001
  const abs = Math.abs(n)
  const digits = Math.abs(abs - Math.round(abs)) < 0.001 ? 0 : 2
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })
  if (neg) return `−${body}`
  if (signed && pos) return `+${body}`
  return body
}

export function formatMult(n: number): string {
  if (!Number.isFinite(n)) return "—×"
  if (n >= 1000) return `${Math.round(n).toLocaleString("en-US")}×`
  if (n >= 100) return `${n.toFixed(1)}×`
  return `${n.toFixed(2)}×`
}

/** Outcome called at boarding, before the crash is drawn. */
export function predictedOutcome(action: SignalAction, target: number): string {
  if (action === "WAIT") return "No call"
  if (action === "SKIP") return `Under ${formatMult(target)}`
  return `Over ${formatMult(target)}`
}

export function outcomeCorrect(action: SignalAction, target: number, crash: number): boolean | null {
  if (action === "WAIT") return null
  const cleared = crash + 1e-9 >= target
  return action === "TAKE" ? cleared : !cleared
}

export function formatPct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`
}

function crashesOf(history: HistRound[]): number[] {
  return history.map((h) => h.crash)
}

export function buildSignal(history: number[], mode: Mode): Signal {
  const window = history.slice(-40)
  const ladder = LADDERS[mode]
  const stakePct = STAKE_PCT[mode]

  if (window.length < 12) {
    const target = 1.5
    return {
      action: "WAIT",
      target,
      hitRate: 0,
      sample: window.length,
      ev: 0,
      fair: fairChance(target),
      stakePct: 0,
      reason: "Warming the tape. Twelve settled rounds, then the desk speaks.",
    }
  }

  let best = { target: ladder[0], hitRate: 0, ev: -1 }
  for (const target of ladder) {
    const hits = window.filter((c) => c + 1e-9 >= target).length
    const hitRate = hits / window.length
    const ev = hitRate * target - 1
    if (ev > best.ev) best = { target, hitRate, ev }
  }

  const take = mode === "aggressive" || best.ev >= FLOOR[mode]
  const action: SignalAction = take ? "TAKE" : "SKIP"
  const fair = fairChance(best.target)
  const edge = `${best.ev >= 0 ? "+" : "−"}${Math.abs(best.ev * 100).toFixed(1)}%`

  let reason: string
  if (!take) {
    reason = `Sit out. Best ladder idea was ${formatMult(best.target)} and the last ${window.length} still lost ${edge} a unit.`
  } else if (best.ev > 0.02) {
    reason = `${formatMult(best.target)} cleared ${formatPct(best.hitRate)} of the last ${window.length}. That is hotter than the 3% edge allows — treat it as noise, not a tell.`
  } else if (best.ev >= 0) {
    reason = `Last ${window.length} rounds, ${formatMult(best.target)} was the least-bad cashout (${formatPct(best.hitRate)} hit, ${edge} window). Size stays small.`
  } else {
    reason = `${formatMult(best.target)} is the ladder's best recent fit (${formatPct(best.hitRate)} hit). Window edge ${edge} — still a house game.`
  }

  return {
    action,
    target: best.target,
    hitRate: best.hitRate,
    sample: window.length,
    ev: best.ev,
    fair,
    stakePct: take ? stakePct : 0,
    reason,
  }
}

export function suggestedStake(bankroll: number, signal: Signal): number {
  if (signal.action !== "TAKE") return 0
  return Math.max(1, Math.round(bankroll * signal.stakePct))
}

export function seedTape(n: number, startId = 1): HistRound[] {
  const rounds: HistRound[] = []
  for (let i = 0; i < n; i++) {
    rounds.push({ id: startId + i, crash: sampleCrashPoint(), live: false })
  }
  return rounds
}

function openBoarding(sim: Sim) {
  sim.roundId += 1
  sim.signal = buildSignal(crashesOf(sim.history), sim.mode)
  sim.phase = "betting"
  sim.phaseLeft = BET_SECONDS
  sim.bet = null
  sim.multiplier = 1
  sim.flightT = 0
  sim.crashPoint = 1
  if (sim.auto && sim.signal.action === "TAKE") {
    tryPlace(sim, sim.signal.target, true)
  }
}

export function createSim(saved: Persisted | null): Sim {
  const history = saved?.history?.length ? saved.history.slice(-80) : seedTape(28)
  const mode = "balanced"
  const bankroll = saved?.bankroll ?? START_BANK
  let roundId = saved?.roundId ?? history.length + 1
  if (history.some((h) => h.id === roundId)) {
    roundId = history.reduce((max, h) => Math.max(max, h.id), 0) + 1
  }
  const sim: Sim = {
    bankroll,
    peak: saved?.peak ?? bankroll,
    mode,
    auto: saved?.auto ?? false,
    pace: saved?.pace === 3 ? 3 : 1,
    stake: saved?.stake ?? 25,
    phase: "betting",
    phaseLeft: BET_SECONDS,
    flightT: 0,
    multiplier: 1,
    crashPoint: 1,
    roundId,
    history,
    signal: buildSignal(crashesOf(history), mode),
    bet: null,
    log: saved?.log?.slice(0, 30) ?? [],
  }
  if (sim.auto && sim.signal.action === "TAKE") {
    tryPlace(sim, sim.signal.target, true)
  }
  return sim
}

export function tryPlace(sim: Sim, cashout: number, fromSignal: boolean): string | null {
  if (sim.phase !== "betting") return "Boarding is closed."
  if (sim.bet) return "Already riding this round."
  const stake = Math.floor(sim.stake)
  if (!Number.isFinite(stake) || stake < 1) return "Stake at least 1."
  if (stake > sim.bankroll + 1e-9) return "Not enough paper for that stake."
  const target = Math.round(cashout * 100) / 100
  if (!Number.isFinite(target) || target < 1.01 || target > 500) {
    return "Cash out between 1.01× and 500×."
  }
  sim.bankroll = money(sim.bankroll - stake)
  sim.bet = { stake, cashout: target, fromSignal }
  return null
}

export function cancelBet(sim: Sim) {
  if (sim.phase !== "betting" || !sim.bet) return
  sim.bankroll = money(sim.bankroll + sim.bet.stake)
  sim.bet = null
}

export function setStake(sim: Sim, stake: number) {
  if (!Number.isFinite(stake)) return
  sim.stake = Math.max(1, Math.min(100000, Math.floor(stake)))
}

export function setMode(sim: Sim, mode: Mode) {
  sim.mode = mode
  if (sim.phase !== "betting" || sim.bet) return
  sim.signal = buildSignal(crashesOf(sim.history), mode)
  if (sim.auto && sim.signal.action === "TAKE") {
    tryPlace(sim, sim.signal.target, true)
  }
}

export function setAuto(sim: Sim, auto: boolean) {
  sim.auto = auto
  if (auto && sim.phase === "betting" && !sim.bet && sim.signal.action === "TAKE") {
    tryPlace(sim, sim.signal.target, true)
  }
}

export function setPace(sim: Sim, pace: 1 | 3) {
  sim.pace = pace
}

export function resetBank(sim: Sim) {
  if (sim.phase !== "betting") return "Wait for boarding to reset."
  if (sim.bet) cancelBet(sim)
  sim.bankroll = START_BANK
  sim.peak = START_BANK
  sim.log = []
  return null
}

function settle(sim: Sim) {
  const crash = sim.crashPoint
  sim.history.push({ id: sim.roundId, crash, live: true })
  if (sim.history.length > 80) sim.history.splice(0, sim.history.length - 80)

  const sig = sim.signal
  let pnl = 0
  let result: LogResult = "flat"
  if (sim.bet) {
    if (crash + 1e-9 >= sim.bet.cashout) {
      const pay = money(sim.bet.stake * sim.bet.cashout)
      pnl = money(pay - sim.bet.stake)
      sim.bankroll = money(sim.bankroll + pay)
      result = "hit"
    } else {
      pnl = -sim.bet.stake
      result = "miss"
    }
  } else if (sig.action === "TAKE") {
    result = "passed"
  }

  sim.peak = Math.max(sim.peak, sim.bankroll)
  sim.log.unshift({
    id: sim.roundId,
    crash,
    action: sig.action,
    target: sig.target,
    followed: Boolean(sim.bet?.fromSignal),
    staked: sim.bet?.stake ?? 0,
    cashout: sim.bet?.cashout ?? null,
    result,
    pnl,
  })
  if (sim.log.length > 30) sim.log.length = 30
}

export type TickEvent = "phase" | null

export function tick(sim: Sim, dt: number): TickEvent {
  const step = Math.min(0.05, Math.max(0, dt)) * sim.pace
  if (sim.phase === "betting") {
    sim.phaseLeft -= step
    if (sim.phaseLeft > 0) return null
    sim.crashPoint = sampleCrashPoint()
    sim.flightT = 0
    sim.multiplier = 1
    if (sim.crashPoint <= 1) {
      settle(sim)
      sim.phase = "crashed"
      sim.phaseLeft = CRASH_HOLD
      return "phase"
    }
    sim.phase = "flying"
    sim.phaseLeft = 0
    return "phase"
  }

  if (sim.phase === "flying") {
    let k = FLIGHT_K
    if (sim.multiplier >= 8) k *= 1 + (sim.multiplier - 8) / 6
    const m = sim.multiplier * Math.exp(k * step)
    if (m >= sim.crashPoint) {
      sim.multiplier = sim.crashPoint
      settle(sim)
      sim.phase = "crashed"
      sim.phaseLeft = CRASH_HOLD
      return "phase"
    }
    sim.multiplier = m
    return null
  }

  sim.phaseLeft -= step
  if (sim.phaseLeft > 0) return null
  openBoarding(sim)
  return "phase"
}

export function flightOf(sim: Sim) {
  const showCrash = sim.phase === "crashed"
  return {
    phase: sim.phase,
    multiplier: showCrash ? sim.crashPoint : sim.phase === "flying" ? sim.multiplier : 1,
    countdown: Math.max(0, sim.phaseLeft),
    roundId: sim.roundId,
    revealed: showCrash ? sim.crashPoint : null,
    inPlay: sim.bet ? { stake: sim.bet.stake, cashout: sim.bet.cashout } : null,
  }
}

export type FlightView = ReturnType<typeof flightOf>

export function snapshot(sim: Sim): Sim {
  return {
    ...sim,
    history: sim.history.slice(),
    log: sim.log.slice(),
    signal: { ...sim.signal },
    bet: sim.bet ? { ...sim.bet } : null,
  }
}

export function toPersisted(sim: Sim): Persisted {
  return {
    bankroll: sim.bankroll,
    peak: sim.peak,
    mode: sim.mode,
    auto: sim.auto,
    pace: sim.pace,
    stake: sim.stake,
    roundId: sim.roundId,
    history: sim.history.slice(-80),
    log: sim.log.slice(0, 30),
  }
}

const MODES: Mode[] = ["conservative", "balanced", "aggressive"]

export function loadPersisted(): Persisted | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<Persisted>
    if (!data || !Array.isArray(data.history) || typeof data.bankroll !== "number") return null
    if (!MODES.includes(data.mode as Mode)) return null
    return {
      bankroll: data.bankroll,
      peak: typeof data.peak === "number" ? data.peak : data.bankroll,
      mode: data.mode as Mode,
      auto: Boolean(data.auto),
      pace: data.pace === 3 ? 3 : 1,
      stake: typeof data.stake === "number" ? data.stake : 25,
      roundId: typeof data.roundId === "number" ? data.roundId : data.history.length + 1,
      history: data.history.filter(
        (h): h is HistRound =>
          !!h && typeof h.id === "number" && typeof h.crash === "number" && typeof h.live === "boolean",
      ),
      log: Array.isArray(data.log) ? (data.log as LogEntry[]).slice(0, 30) : [],
    }
  } catch {
    return null
  }
}

export function persist(sim: Sim) {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(sim)))
  } catch {
    /* ignore quota */
  }
}

export function bandCounts(history: HistRound[]) {
  const window = history.slice(-40)
  const bands = [
    { label: "<1.5×", test: (n: number) => n < 1.5 },
    { label: "1.5–3×", test: (n: number) => n >= 1.5 && n < 3 },
    { label: "3–10×", test: (n: number) => n >= 3 && n < 10 },
    { label: "10×+", test: (n: number) => n >= 10 },
  ]
  const n = Math.max(1, window.length)
  return bands.map((b) => {
    const count = window.filter((h) => b.test(h.crash)).length
    return { label: b.label, count, share: count / n }
  })
}
