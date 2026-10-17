"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { waLink } from "@/lib/clients";
import { R, toMin, type DayHours } from "@/lib/settings";
import { addDays, parseDay, type RosterTech, type WorkStatus } from "@/lib/roster";
import { markReminded, saveBooking, setBookingStatus, type BookingMsg } from "./actions";
import { setDayChange } from "../roster/actions";

export interface Booking {
  id: string; client_id: string | null; client_name: string; phone: string; tech_id: string; day: string;
  start_time: string; duration_min: number; status: "booked" | "arrived" | "done" | "cancelled" | "no_show";
  deposit: number; notes: string; reminded_at: string | null; status_by: string; status_at: string | null;
  created_by_name: string; created_at: string; updated_by_name: string;
  booking_items: { item_id: string | null; name: string; price: number; duration_min: number; position: number }[];
}
type Service = { id: string; name: string; price: number; duration_min: number | null; category: string };
type ClientLite = { id: string; name: string; phone: string; email: string };

const SLOT = 15, SLOT_H = 16;
const ACTIVE = (b: Booking) => b.status !== "cancelled" && b.status !== "no_show";
const hhmm = (t: string) => t.slice(0, 5);
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const label = (b: Booking) => [...b.booking_items].sort((a, c) => a.position - c.position).map((i) => i.name).join(" + ") || "Service";
const longDate = (d: string) => parseDay(d).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const STATUS_TEXT: Record<string, string> = { arrived: " · arrived", done: " · paid" };

interface Props {
  day: string; today: string; techs: RosterTech[]; status: Record<string, WorkStatus>; usual: Record<string, boolean>;
  bookings: Booking[]; services: Service[]; clients: ClientLite[]; hours: DayHours; follow: boolean;
  canRoster: boolean; canCancel: boolean; businessName: string;
}

export function Diary(p: Props) {
  const router = useRouter();
  const [form, setForm] = useState<null | { booking?: Booking; techId?: string; start?: string }>(null);
  const [panel, setPanel] = useState<null | "who" | "reminders">(null);
  const working = p.techs.filter((t) => p.status[t.id]?.on);
  const off = p.techs.filter((t) => !p.status[t.id]?.on);
  const active = p.bookings.filter(ACTIVE);
  const gone = p.bookings.filter((b) => !ACTIVE(b));

  // Visible hours: opening hours, stretched to fit any booking outside them.
  let s = toMin(p.hours.open), e = toMin(p.hours.close);
  active.forEach((b) => { s = Math.min(s, toMin(hhmm(b.start_time))); e = Math.max(e, toMin(hhmm(b.start_time)) + b.duration_min); });
  const start = Math.floor(s / 60) * 60, end = Math.ceil(e / 60) * 60, H = ((end - start) / SLOT) * SLOT_H;
  const y = (m: number) => ((m - start) / SLOT) * SLOT_H;

  const go = (d: string) => router.push(`/diary?d=${d}`);

  return (
    <main>
      <div className="diary-bar">
        <h1>Diary</h1>
        <button onClick={() => go(addDays(p.day, -1))} aria-label="Previous day">‹</button>
        <input type="date" value={p.day} onChange={(e) => e.target.value && go(e.target.value)} aria-label="Date" style={{ width: "auto" }} />
        <button onClick={() => go(addDays(p.day, 1))} aria-label="Next day">›</button>
        {p.day !== p.today && <button onClick={() => go(p.today)}>Today</button>}
        <span className="muted">{longDate(p.day)}</span>
        <span style={{ flex: 1 }} />
        {p.canRoster && <button onClick={() => setPanel("who")}>Who&apos;s working ({working.length})</button>}
        <button onClick={() => setPanel("reminders")}>Reminders</button>
        <button className="primary" onClick={() => setForm({ techId: working[0]?.id, start: p.hours.open })} disabled={!p.services.length || !p.techs.length}>New booking</button>
      </div>

      {!p.techs.length && <p className="notice" style={{ margin: "0 20px 10px" }}>Add your technicians under <Link href="/settings">Settings</Link> first.</p>}
      {p.techs.length > 0 && !p.services.length && <p className="notice" style={{ margin: "0 20px 10px" }}>Add your services under <Link href="/stock">Stock &amp; services</Link> to start taking bookings.</p>}
      {p.hours.closed && <p className="notice" style={{ margin: "0 20px 10px" }}>The salon is normally closed on this day. You can still add bookings.</p>}
      {off.length > 0 && (
        <div className="off-strip">
          <span className="muted">Not working:</span>
          {off.map((t) => <OffChip key={t.id} t={t} st={p.status[t.id]} day={p.day} usualOn={p.usual[t.id]} canRoster={p.canRoster} isToday={p.day === p.today} />)}
        </div>
      )}

      {working.length ? (
        <div className="diary-wrap">
          <div className="diary" style={{ gridTemplateColumns: `56px repeat(${working.length}, minmax(150px, 1fr))` }}>
            <div className="dh" />
            {working.map((t) => <div key={t.id} className="dh" style={{ ["--tc" as string]: t.colour }}><span className="dot" />{t.name}</div>)}
            <div className="times" style={{ height: H }}>
              {Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60).map((m) => <span key={m} style={{ top: y(m) }}>{fromMin(m)}</span>)}
            </div>
            {working.map((t) => (
              <div key={t.id} className="col" style={{ height: H }}
                onClick={(ev) => {
                  if (ev.target !== ev.currentTarget) return;
                  const m = Math.min(end - SLOT, start + Math.floor((ev.clientY - ev.currentTarget.getBoundingClientRect().top) / SLOT_H) * SLOT);
                  setForm({ techId: t.id, start: fromMin(m) });
                }}>
                {!p.hours.closed && (
                  <div className="closed-shade" style={{ background: `linear-gradient(to bottom, var(--shade) 0 ${y(toMin(p.hours.open))}px, transparent 0 ${y(toMin(p.hours.close))}px, var(--shade) 0)` }} />
                )}
                {active.filter((b) => b.tech_id === t.id).map((b) => (
                  <button key={b.id} className={`booking ${b.status}`} onClick={() => setForm({ booking: b })}
                    style={{ top: y(toMin(hhmm(b.start_time))), height: Math.max(SLOT_H, (b.duration_min / SLOT) * SLOT_H) - 2, ["--tc" as string]: t.colour }}>
                    <b>{b.client_name}</b>{hhmm(b.start_time)} {label(b)}{STATUS_TEXT[b.status] || ""}{Number(b.deposit) ? ` · deposit ${R(b.deposit)}` : ""}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : p.techs.length > 0 && (
        <p className="empty" style={{ padding: "0 20px" }}>Nobody is working on this day.{p.canRoster ? " Use “Add to this day” above, or Who's working." : ""}</p>
      )}

      {gone.length > 0 && (
        <div className="cx-list">
          <h2 style={{ margin: "10px 0 4px" }}>Cancelled and no-shows</h2>
          {gone.map((b) => (
            <div key={b.id} className="trow">
              <span>{hhmm(b.start_time)} · <b>{b.client_name}</b> · {label(b)} with {p.techs.find((t) => t.id === b.tech_id)?.name}</span>
              <span><span className="badge">{b.status === "no_show" ? "No-show" : "Cancelled"}</span> <button className="ed" onClick={() => setForm({ booking: b })}>Open</button></span>
            </div>
          ))}
        </div>
      )}

      {form && (
        <BookingForm key={form.booking?.id || "new"} {...p} booking={form.booking} techId={form.techId} start={form.start} onClose={() => setForm(null)} />
      )}
      {panel === "who" && <WhoWorking {...p} onClose={() => setPanel(null)} />}
      {panel === "reminders" && <Reminders {...p} onClose={() => setPanel(null)} />}
    </main>
  );
}

function OffChip({ t, st, day, usualOn, canRoster, isToday }: { t: RosterTech; st: WorkStatus; day: string; usualOn: boolean; canRoster: boolean; isToday: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const add = () => {
    if (st.leave && !confirm(`${t.name} is on ${st.leave.type.toLowerCase()}. Add them as working on this day anyway?`)) return;
    start(async () => { const r = await setDayChange(t.id, day, usualOn ? null : "on", `was: ${st.why}`); if (r?.error) setErr(r.error); });
  };
  return (
    <span className="off-chip" style={{ ["--tc" as string]: t.colour }}>
      <span className="dot" />{t.name} <span className="muted">· {st.why}</span>
      {canRoster && <button className="ed" onClick={add} disabled={pending}>{pending ? "Adding…" : `Add to ${isToday ? "today" : "this day"}`}</button>}
      {err && <span className="err small">{err}</span>}
    </span>
  );
}

function BookingForm(p: Props & { booking?: Booking; techId?: string; start?: string; onClose: () => void }) {
  const b = p.booking;
  const [state, action, pending] = useActionState<BookingMsg, FormData>(saveBooking, null);
  const [statusPending, startStatus] = useTransition();
  const [statusErr, setStatusErr] = useState("");
  const v = state?.values;
  // Ticked services live in React state, so they survive the form re-showing after a warning.
  const [picked, setPicked] = useState<string[]>(b ? b.booking_items.map((i) => i.item_id || "").filter(Boolean) : []);
  const [duration, setDuration] = useState<number>(b?.duration_min ?? 30);
  const [client, setClient] = useState(b?.client_name ?? "");
  const [phone, setPhone] = useState(b?.phone ?? "");
  const gone = b && !ACTIVE(b);
  const done = b?.status === "done";

  useEffect(() => { if (state?.ok) p.onClose(); }, [state, p]);
  const total = useMemo(() => picked.map((id) => p.services.find((s) => s.id === id)).filter(Boolean) as Service[], [picked, p.services]);
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...picked, id] : picked.filter((x) => x !== id);
    setPicked(next);
    const mins = next.reduce((s, x) => s + (p.services.find((y) => y.id === x)?.duration_min || 0), 0);
    if (mins) setDuration(Math.max(15, Math.ceil(mins / SLOT) * SLOT));
  };
  const pickClient = (name: string) => {
    setClient(name);
    const c = p.clients.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    if (c && !phone) setPhone(c.phone);
  };
  const status = (s: "booked" | "arrived" | "cancelled" | "no_show", ask?: string) => {
    if (ask && !confirm(ask)) return;
    setStatusErr("");
    startStatus(async () => { const r = await setBookingStatus(b!.id, s); if (r?.error) setStatusErr(r.error); else p.onClose(); });
  };
  const slots = Array.from({ length: (22 * 60 - 6 * 60) / SLOT }, (_, i) => fromMin(6 * 60 + i * SLOT));
  const startVal = v?.start_time ?? (b ? hhmm(b.start_time) : p.start || "09:00");

  return (
    <Modal title={b ? `Booking: ${b.client_name}` : "New booking"} onClose={p.onClose}>
      {b && (
        <p className="muted small" style={{ marginTop: -8 }}>
          {b.created_by_name && `Booked by ${b.created_by_name} on ${new Date(b.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
          {b.updated_by_name && ` · last changed by ${b.updated_by_name}`}
          {gone && ` · ${b.status === "no_show" ? "marked as a no-show" : "cancelled"}${b.status_by ? " by " + b.status_by : ""}`}
          {b.status === "arrived" && " · client has arrived"}
          {done && " · paid and completed"}
        </p>
      )}
      <form action={action} key={v ? JSON.stringify(v) : "f"}>
        {b && <input type="hidden" name="id" value={b.id} />}
        {state?.error && <p className="err" role="alert">{state.error}</p>}
        {state?.warn && (
          <div className="notice warn" role="alert">
            <b>Check before saving</b>
            <ul style={{ margin: "6px 0 0" }}>{state.warn.map((w) => <li key={w}>{w}</li>)}</ul>
            <input type="hidden" name="confirm" value="1" />
          </div>
        )}
        <div className="grid2">
          <label className="fld">Client name
            <input name="client_name" value={client} onChange={(e) => pickClient(e.target.value)} list="diary-clients" autoComplete="off" required />
            <datalist id="diary-clients">{p.clients.map((c) => <option key={c.id} value={c.name}>{c.phone}</option>)}</datalist>
          </label>
          <label className="fld">Cellphone
            <input name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
          </label>
          <div className="fld span2">Services
            <div className="svc-pick">
              {p.services.map((s) => (
                <label key={s.id}>
                  <input type="checkbox" name="item" value={s.id} checked={picked.includes(s.id)} onChange={(e) => toggle(s.id, e.target.checked)} />
                  {s.name} <span className="muted">· {s.duration_min} min · {R(s.price)}</span>
                </label>
              ))}
            </div>
            <span className="small">{total.length ? `${total.length} service${total.length === 1 ? "" : "s"} · ${total.reduce((a, s) => a + (s.duration_min || 0), 0)} min · ${R(total.reduce((a, s) => a + Number(s.price), 0))}` : "Tick at least one service"}</span>
          </div>
          <label className="fld">Technician
            <select name="tech_id" defaultValue={v?.tech_id ?? b?.tech_id ?? p.techId}>
              {p.techs.map((t) => <option key={t.id} value={t.id}>{t.name}{p.status[t.id]?.on ? "" : ` (${p.status[t.id]?.why.toLowerCase()})`}</option>)}
            </select>
          </label>
          <label className="fld">Date<input name="day" type="date" defaultValue={v?.day ?? b?.day ?? p.day} required /></label>
          <label className="fld">Start time
            <select name="start_time" defaultValue={startVal}>{slots.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label className="fld">Length (minutes)
            <input name="duration_min" type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} />
          </label>
          <label className="fld">Deposit paid (R)<input name="deposit" type="number" min={0} step={1} defaultValue={v?.deposit ?? (Number(b?.deposit) || "")} placeholder="0" /></label>
          <label className="fld">Notes<input name="notes" defaultValue={v?.notes ?? b?.notes} autoComplete="off" /></label>
        </div>
        {statusErr && <p className="err">{statusErr}</p>}
        <div className="row">
          {!gone && !done && <button className="primary" disabled={pending}>{pending ? "Saving…" : state?.warn ? "Save anyway" : "Save booking"}</button>}
          {b?.status === "booked" && <button type="button" onClick={() => status("arrived")} disabled={statusPending}>Client arrived</button>}
          {b?.status === "arrived" && <button type="button" onClick={() => status("booked")} disabled={statusPending}>Not arrived</button>}
          {b && (b.status === "booked" || b.status === "arrived") && p.canCancel && (
            <>
              <button type="button" className="danger" disabled={statusPending} onClick={() => status("cancelled", `Cancel ${b.client_name}'s booking at ${hhmm(b.start_time)}? The time becomes free and the booking stays in their history.`)}>Cancel booking</button>
              <button type="button" className="danger" disabled={statusPending} onClick={() => status("no_show", `Mark ${b.client_name} as a no-show?`)}>No-show</button>
            </>
          )}
          {gone && <button type="button" className="primary" disabled={statusPending} onClick={() => status("booked")}>Restore booking</button>}
          <button type="button" className="ghost" onClick={p.onClose}>Close</button>
        </div>
        {b && (b.status === "booked" || b.status === "arrived") && !p.canCancel && <p className="muted small">Cancelling or marking a no-show needs a manager.</p>}
      </form>
    </Modal>
  );
}

function WhoWorking(p: Props & { onClose: () => void }) {
  const [on, setOn] = useState<string[]>(p.techs.filter((t) => p.status[t.id]?.on).map((t) => t.id));
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const save = () => start(async () => {
    for (const t of p.techs) {
      const want = on.includes(t.id);
      if (want === p.status[t.id]?.on) continue;
      // Go back to the usual roster if that gives the wanted answer; otherwise change this day only.
      const r = await setDayChange(t.id, p.day, want === p.usual[t.id] ? null : want ? "on" : "off");
      if (r?.error) { setErr(r.error); return; }
    }
    p.onClose();
  });
  return (
    <Modal title="Who's working" onClose={p.onClose}>
      <p className="muted small" style={{ marginTop: -8 }}>{longDate(p.day)} · changes apply to this day only</p>
      <div className="check-list">
        {p.techs.map((t) => (
          <label key={t.id} className="chk">
            <input type="checkbox" checked={on.includes(t.id)} onChange={(e) => setOn((o) => (e.target.checked ? [...o, t.id] : o.filter((x) => x !== t.id)))} />
            <span className="dot" style={{ ["--tc" as string]: t.colour }} />
            <span>{t.name}{p.status[t.id]?.why !== "Working" && <><br /><span className="muted small">{p.status[t.id]?.why}</span></>}</span>
          </label>
        ))}
      </div>
      {err && <p className="err">{err}</p>}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="primary" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button className="ghost" onClick={p.onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function Reminders(p: Props & { onClose: () => void }) {
  const list = p.bookings.filter((b) => b.status === "booked");
  const [, start] = useTransition();
  const when = parseDay(p.day).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  const msg = (b: Booking) =>
    `Hi ${b.client_name.split(" ")[0]}, this is a reminder of your ${label(b)} appointment with ${p.techs.find((t) => t.id === b.tech_id)?.name} at ${p.businessName} on ${when} at ${hhmm(b.start_time)}. Please reply if you need to change it. See you then!`;
  return (
    <Modal title={`Reminders for ${when}`} onClose={p.onClose}>
      {list.length ? list.map((b) => {
        const phone = b.phone || p.clients.find((c) => c.id === b.client_id)?.phone || "";
        const email = p.clients.find((c) => c.id === b.client_id)?.email || "";
        const wa = waLink(phone, msg(b));
        return (
          <div key={b.id} className="rem-row">
            <span><b>{hhmm(b.start_time)} {b.client_name}</b><br />
              <span className="muted small">{label(b)}{b.reminded_at && <span style={{ color: "var(--ok)" }}> · reminded {new Date(b.reminded_at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}</span>
            </span>
            <span className="row">
              {wa && <a className="btn small" href={wa} target="_blank" rel="noopener" onClick={() => start(() => markReminded(b.id))}>WhatsApp</a>}
              {email && <a className="btn small" href={`mailto:${email}?subject=${encodeURIComponent("Appointment reminder: " + p.businessName)}&body=${encodeURIComponent(msg(b))}`} onClick={() => start(() => markReminded(b.id))}>Email</a>}
              {!wa && !email && <span className="muted small">No cellphone or email</span>}
            </span>
          </div>
        );
      }) : <p className="empty">No upcoming bookings on this day.</p>}
      <p className="muted small">Tip: go to tomorrow in the diary to send tomorrow&apos;s reminders.</p>
      <div className="row"><button className="ghost" onClick={p.onClose}>Close</button></div>
    </Modal>
  );
}
