import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Check, i as Menu, n as Wallet, t as X } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D9sM10aF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STORAGE_KEY = "aviator-predictor-v1";
function loadSaved() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!Number.isFinite(parsed.current) || !Array.isArray(parsed.rows)) return null;
		return parsed;
	} catch {
		return null;
	}
}
function formatCoef(n) {
	if (n >= 1e3) return `${Math.round(n).toLocaleString("en-US")}x`;
	return `${n.toFixed(2)}x`;
}
function formatClock(ms) {
	const total = Math.max(0, Math.floor(ms / 1e3));
	return `${String(Math.floor(total / 3600)).padStart(2, "0")} : ${String(Math.floor(total % 3600 / 60)).padStart(2, "0")} : ${String(total % 60).padStart(2, "0")}`;
}
function Predictor() {
	const [current, setCurrent] = (0, import_react.useState)(1);
	const [nextId, setNextId] = (0, import_react.useState)(1);
	const [rows, setRows] = (0, import_react.useState)([]);
	const [arranged, setArranged] = (0, import_react.useState)([]);
	const [startedAt, setStartedAt] = (0, import_react.useState)(0);
	const [now, setNow] = (0, import_react.useState)(0);
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [walletOpen, setWalletOpen] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("1.00");
	const [flash, setFlash] = (0, import_react.useState)(0);
	const [signalLocked, setSignalLocked] = (0, import_react.useState)(true);
	const [lockRun, setLockRun] = (0, import_react.useState)(0);
	const nextIdRef = (0, import_react.useRef)(1);
	const rowsRef = (0, import_react.useRef)([]);
	const queueRef = (0, import_react.useRef)([]);
	const queueIndexRef = (0, import_react.useRef)(0);
	function openWallet() {
		const planned = queueRef.current;
		const listed = planned.length ? planned : [...rowsRef.current].sort((a, b) => a.id - b.id).map((row) => row.coefficient);
		setDraft(listed.length ? listed.map((value) => value.toFixed(2)).join(", ") : current.toFixed(2));
		setWalletOpen(true);
	}
	function remember(coefficient) {
		const full = rowsRef.current.length >= 10;
		const id = full ? 1 : nextIdRef.current;
		nextIdRef.current = id + 1;
		const next = full ? [{
			id,
			coefficient,
			at: Date.now()
		}] : [{
			id,
			coefficient,
			at: Date.now()
		}, ...rowsRef.current];
		rowsRef.current = next;
		setNextId(nextIdRef.current);
		setRows(next);
	}
	function commitDraft() {
		const values = draft.split(/[^0-9.]+/).map((part) => Number(part)).filter((value) => Number.isFinite(value) && value >= 1).slice(0, 10);
		if (values.length === 0) return false;
		queueRef.current = values;
		queueIndexRef.current = 0;
		setArranged(values);
		setDraft(values.map((value) => value.toFixed(2)).join(", "));
		return true;
	}
	function startOrder() {
		if (!commitDraft()) return;
		queueIndexRef.current = 0;
		setWalletOpen(false);
	}
	function nextSignal() {
		if (signalLocked) return;
		const queue = queueRef.current;
		if (queue.length === 0) openWallet();
		else {
			const index = queueIndexRef.current % queue.length;
			const coefficient = queue[index];
			queueIndexRef.current = (index + 1) % queue.length;
			setCurrent(coefficient);
			setFlash((count) => count + 1);
			remember(coefficient);
		}
		setSignalLocked(true);
		setLockRun((count) => count + 1);
	}
	(0, import_react.useEffect)(() => {
		const id = window.setTimeout(() => setSignalLocked(false), 1e4);
		return () => window.clearTimeout(id);
	}, [lockRun]);
	(0, import_react.useEffect)(() => {
		const saved = loadSaved();
		if (saved && saved.rows.length < 10) {
			setCurrent(saved.current);
			setNextId(saved.nextId);
			nextIdRef.current = saved.nextId;
			const kept = saved.rows.slice(0, 9);
			rowsRef.current = kept;
			setRows(kept);
			setStartedAt(saved.startedAt);
			setDraft(saved.current.toFixed(2));
		} else {
			setStartedAt(Date.now());
			setCurrent(1);
			setDraft("1.00");
		}
		setNow(Date.now());
	}, []);
	(0, import_react.useEffect)(() => {
		if (!startedAt) return;
		const payload = {
			current,
			nextId,
			rows,
			startedAt,
			auto: false
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	}, [
		current,
		nextId,
		rows,
		startedAt
	]);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, []);
	const coefLabel = formatCoef(current);
	const coefSize = coefLabel.length > 7 ? "text-3xl" : "text-5xl";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col overflow-x-hidden bg-white text-[#1c1c1c]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "relative px-5 pt-5 pb-14 text-white",
				style: {
					backgroundImage: "radial-gradient(ellipse at 62% 42%, rgba(56, 112, 168, 0.55), transparent 58%), repeating-conic-gradient(from 208deg at 0% 100%, #070b12 0deg 7deg, #16324c 7deg 14deg, #0c1828 14deg 21deg)",
					borderBottomLeftRadius: "50% 42px",
					borderBottomRightRadius: "50% 42px"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex w-full max-w-md items-center justify-between",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Signal record",
							onClick: () => setMenuOpen(true),
							className: "grid size-10 place-items-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {
								className: "size-6",
								strokeWidth: 2.25
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlaneMark, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Wallet",
							"aria-pressed": walletOpen,
							onClick: openWallet,
							className: "grid size-10 place-items-center rounded-full active:scale-90",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, {
								className: "size-6",
								strokeWidth: 2
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-3 px-2 text-center font-[family-name:var(--font-display)] text-[clamp(1.35rem,5vw,2.15rem)] leading-none font-extrabold tracking-[0.12em] whitespace-nowrap text-white",
					children: "AVIATOR PREDICTOR"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "coef-stage relative grid size-72 place-items-center sm:size-80",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ping ping-a",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ping ping-b",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ping ping-c",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "dash-ring",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "scanline",
								"aria-hidden": "true"
							}),
							flash > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "coef-flash",
								"aria-hidden": "true"
							}, flash) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "relative z-10 grid size-56 place-items-center overflow-hidden rounded-full bg-[url('/next-odds-bg.jpg')] bg-cover bg-center shadow-[0_0_32px_rgba(0,0,0,0.45)] sm:size-60",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: `font-semibold tracking-tight text-white ${coefSize}`,
										children: coefLabel
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-sm text-white/70",
										children: "Predicted coefficient"
									})]
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: nextSignal,
						disabled: signalLocked,
						className: `mt-8 w-full max-w-xs rounded-full bg-[url('/next-odds-bg.jpg')] bg-cover bg-center py-4 text-lg font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.45)] ${signalLocked ? "cursor-not-allowed opacity-60" : ""}`,
						children: "Next signal"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-black/10",
						"aria-hidden": "true",
						children: signalLocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "signal-load" }, lockRun) : null
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "mt-auto bg-[url('/next-odds-bg.jpg')] bg-cover bg-center px-4 pt-16 pb-8 text-white [border-top-left-radius:50%_48px] [border-top-right-radius:50%_48px]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto w-full max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-4 flex items-baseline justify-between gap-3 px-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-sm font-medium text-white/80",
								children: "Signal record"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-white/45",
								children: [rows.length, " saved"]
							})]
						}),
						rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-4 px-1 text-sm text-white/50",
							children: "Tap Next signal. Each shown coefficient is saved here."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mb-4 flex gap-2 overflow-x-auto pb-1",
							children: rows.slice(0, 8).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "shrink-0 rounded-full bg-white/10 px-3 py-1 font-mono text-sm text-white",
								children: formatCoef(row.coefficient)
							}, row.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-4 rounded-2xl bg-[#1c1c1e] px-4 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-lg text-white/90",
								children: formatCoef(current)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "flex items-center justify-end gap-1.5 text-sm font-medium text-[#3ddc84]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
										className: "size-4",
										strokeWidth: 3
									}), "Connected"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 font-mono text-sm tracking-wide text-white/80",
									children: formatClock(startedAt ? now - startedAt : 0)
								})]
							})]
						})
					]
				})
			}),
			walletOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed inset-0 z-20 flex flex-col bg-[url('/next-odds-bg.jpg')] bg-cover bg-center text-white",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-5 py-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-semibold",
							children: "Wallet"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Close",
							onClick: () => setWalletOpen(false),
							className: "grid size-10 place-items-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-6" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-5 text-sm text-white/50",
						children: "Arrange the odds, then tap Done. Next signal shows them in that order."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-5 pt-4 font-mono text-3xl font-semibold",
						children: coefLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-4 flex flex-col gap-2 px-5",
						onSubmit: (event) => {
							event.preventDefault();
							startOrder();
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: draft,
							onChange: (event) => setDraft(event.target.value),
							"aria-label": "Odds",
							rows: 3,
							placeholder: "1.20, 1.85, 3.40",
							className: "w-full resize-none rounded-2xl bg-white/10 px-4 py-3 font-mono text-base text-white outline-none placeholder:text-white/30"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "h-12 rounded-full bg-white text-sm font-semibold text-[#111]",
							children: "Done"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 flex-1 divide-y divide-white/10 overflow-y-auto",
						children: arranged.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "px-5 py-6 text-sm text-white/50",
							children: "No odds arranged yet."
						}) : arranged.map((coefficient, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between px-5 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-sm text-white/45",
								children: ["#", index + 1]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-lg",
								children: formatCoef(coefficient)
							})]
						}, `${coefficient}-${index}`))
					})
				]
			}) : null,
			menuOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed inset-0 z-20 flex flex-col bg-[url('/next-odds-bg.jpg')] bg-cover bg-center text-white",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-5 py-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-semibold",
							children: "Signal record"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Close",
							onClick: () => setMenuOpen(false),
							className: "grid size-10 place-items-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-6" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-5 text-sm text-white/50",
						children: "Paper coefficients from this session. Not a casino feed, and not a guarantee."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 flex-1 divide-y divide-white/10 overflow-y-auto",
						children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "px-5 py-6 text-sm text-white/50",
							children: "No coefficients saved yet."
						}) : rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between px-5 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-sm text-white/45",
								children: ["#", row.id]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-lg",
								children: formatCoef(row.coefficient)
							})]
						}, row.id))
					})
				]
			}) : null
		]
	});
}
function PlaneMark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: "/plane.png",
		alt: "",
		className: "float-loop h-12 w-auto"
	});
}
function Desk() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Predictor, {});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-dvh bg-white text-[#1c1c1c]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Desk, {})
	});
}
//#endregion
export { Home as component };
