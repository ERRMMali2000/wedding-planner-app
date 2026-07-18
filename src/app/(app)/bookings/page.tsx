"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMe } from "@/lib/useMe";
import type { EventRow, Booking } from "@/lib/types";
import { BOOKING_STATUSES, BOOKING_CATEGORIES, leadFor } from "@/lib/types";

const WEDDING_DATE = new Date(process.env.NEXT_PUBLIC_WEDDING_DATE || "2027-01-29");

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function urgency(b: Booking) {
  if (["Booked", "Confirmed", "Cancelled"].includes(b.status))
    return { label: b.status, cls: "bg-green-100 text-green-700", overdue: false };
  const lead = leadFor(b.category);
  const idealBy = new Date(WEDDING_DATE.getTime() - lead * 86400000);
  const daysToIdeal = Math.ceil((idealBy.getTime() - Date.now()) / 86400000);
  if (daysToIdeal < 0) return { label: "Overdue", cls: "bg-red-100 text-red-600", overdue: true };
  if (daysToIdeal <= 20) return { label: "Critical", cls: "bg-red-100 text-red-600", overdue: false };
  if (daysToIdeal <= 45) return { label: "Urgent", cls: "bg-orange-100 text-orange-600", overdue: false };
  if (daysToIdeal <= 90) return { label: "Upcoming", cls: "bg-yellow-100 text-yellow-700", overdue: false };
  return { label: "On track", cls: "bg-green-100 text-green-700", overdue: false };
}

export default function BookingsPage() {
  const supabase = createClient();
  const { isAdmin } = useMe();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editing, setEditing] = useState<Partial<Booking> | null>(null);
  const [fStatus, setFStatus] = useState("");
  const [fCat, setFCat] = useState("");
  const [fEvent, setFEvent] = useState("");

  async function load() {
    const { data: ev } = await supabase.from("events").select("*").eq("archived", false);
    const { data: bk } = await supabase.from("bookings").select("*").order("category");
    setEvents(ev ?? []);
    setBookings(bk ?? []);
  }
  useEffect(() => {
    load();
    const channel = supabase
      .channel("bookings-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function eventName(id: string | null) {
    return events.find((e) => e.id === id)?.name ?? "—";
  }

  const total = bookings.length;
  const confirmed = bookings.filter((b) => ["Booked", "Confirmed"].includes(b.status)).length;
  const pending = bookings.filter((b) => !["Booked", "Confirmed", "Cancelled"].includes(b.status)).length;
  const overdue = bookings.filter((b) => urgency(b).overdue);

  const trials = bookings
    .flatMap((b) => {
      const rows: { label: string; date: string }[] = [];
      if (b.trial_date) rows.push({ label: `${b.category} trial — ${b.vendor_name || "TBD"}`, date: b.trial_date });
      if (b.fitting_dates) rows.push({ label: `${b.category} fitting — ${b.vendor_name || "TBD"}`, date: b.fitting_dates });
      return rows;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const filtered = bookings.filter(
    (b) => (!fStatus || b.status === fStatus) && (!fCat || b.category === fCat) && (!fEvent || b.event_id === fEvent)
  );

  async function save() {
    if (!editing) return;
    const payload = {
      category: editing.category || BOOKING_CATEGORIES[0].name,
      vendor_name: editing.vendor_name || "",
      event_id: editing.event_id || null,
      status: editing.status || "Not Booked",
      booking_date: editing.booking_date || null,
      contract_signed: !!editing.contract_signed,
      advance_paid: Number(editing.advance_paid) || 0,
      balance_due: Number(editing.balance_due) || 0,
      final_payment_due: editing.final_payment_due || null,
      contact_person: editing.contact_person || "",
      phone: editing.phone || "",
      trial_date: editing.trial_date || null,
      fitting_dates: editing.fitting_dates || "",
      notes: editing.notes || "",
    };
    if (editing.id) {
      await supabase.from("bookings").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("bookings").insert(payload);
    }
    setEditing(null);
    load();
  }
  async function remove(id: string) {
    await supabase.from("bookings").delete().eq("id", id);
    setEditing(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl font-semibold">Booking tracker</h1>
        {isAdmin && (
          <button
            className="bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-lg"
            onClick={() => setEditing({ category: BOOKING_CATEGORIES[0].name, status: "Not Booked", contract_signed: false, advance_paid: 0, balance_due: 0 })}
          >
            + Add booking
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Metric label="Total bookings needed" val={total} />
        <Metric label="Confirmed / booked" val={confirmed} />
        <Metric label="Still pending" val={pending} />
        <Metric label="Overdue & unbooked" val={overdue.length} danger={overdue.length > 0} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h2 className="text-sm font-semibold mb-2">Overdue &amp; critical bookings</h2>
          <div className="flex flex-col gap-2">
            {bookings.filter((b) => { const u = urgency(b); return u.overdue || u.label === "Critical"; }).map((b) => {
              const u = urgency(b);
              return (
                <div key={b.id} className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-white text-sm cursor-pointer" onClick={() => setEditing(b)}>
                  <span className="flex-1 font-medium">{b.category}{b.vendor_name ? " — " + b.vendor_name : " (not booked yet)"}</span>
                  <span className="text-xs text-neutral-400">{eventName(b.event_id)}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.cls}`}>{u.label}</span>
                </div>
              );
            })}
            {!bookings.some((b) => { const u = urgency(b); return u.overdue || u.label === "Critical"; }) && (
              <p className="text-sm text-neutral-400">No overdue or critical bookings — you're on track.</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-2">Upcoming trials &amp; fittings</h2>
          <div className="flex flex-col gap-2">
            {trials.map((t, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-white text-sm">
                <span className="flex-1">{t.label}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald/10 text-emerald">
                  {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
            {!trials.length && <p className="text-sm text-neutral-400">No trials or fittings scheduled yet.</p>}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold mb-2">Progress by category</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {BOOKING_CATEGORIES.map((c) => {
          const items = bookings.filter((b) => b.category === c.name);
          if (!items.length) return <div key={c.name} className="bg-white border rounded-xl p-3"><div className="text-xs text-neutral-500">{c.name}</div><div className="text-sm text-neutral-300 mt-1">Not tracked</div></div>;
          const done = items.filter((b) => ["Booked", "Confirmed"].includes(b.status)).length;
          const pct = Math.round((done / items.length) * 100);
          return (
            <div key={c.name} className="bg-white border rounded-xl p-3">
              <div className="text-xs text-neutral-500">{c.name}</div>
              <div className="font-serif text-xl font-semibold">{pct}%</div>
              <div className="h-1.5 bg-neutral-200 rounded mt-1"><div className="h-full bg-emerald rounded" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-semibold mb-2">All bookings</h2>
      <div className="flex gap-2 mb-3">
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All statuses</option>{BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={fCat} onChange={(e) => setFCat(e.target.value)}>
          <option value="">All categories</option>{BOOKING_CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={fEvent} onChange={(e) => setFEvent(e.target.value)}>
          <option value="">All functions</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-400 border-b">
              <th className="p-2">Category</th><th className="p-2">Vendor</th><th className="p-2">Function</th><th className="p-2">Status</th>
              <th className="p-2">Urgency</th><th className="p-2">Advance</th><th className="p-2">Balance</th><th className="p-2">Final due</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const u = urgency(b);
              return (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="p-2">{b.category}</td>
                  <td className="p-2">{b.vendor_name || "—"}</td>
                  <td className="p-2">{eventName(b.event_id)}</td>
                  <td className="p-2">{b.status}</td>
                  <td className="p-2"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.cls}`}>{u.label}</span></td>
                  <td className="p-2">{fmt(b.advance_paid)}</td>
                  <td className="p-2">{fmt(b.balance_due)}</td>
                  <td className="p-2">{b.final_payment_due ? new Date(b.final_payment_due).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="p-2">{isAdmin && <button className="text-xs border rounded-full px-3 py-1" onClick={() => setEditing(b)}>Edit</button>}</td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={9} className="p-6 text-center text-neutral-400">No bookings match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-[440px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg mb-4">{editing.id ? "Edit booking" : "Add booking"}</h3>
            <div className="space-y-3 text-sm">
              <Field label="Category"><select className="w-full border rounded-lg px-3 py-2" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{BOOKING_CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field>
              <Field label="Vendor name"><input className="w-full border rounded-lg px-3 py-2" placeholder="Leave blank if not yet chosen" value={editing.vendor_name || ""} onChange={(e) => setEditing({ ...editing, vendor_name: e.target.value })} /></Field>
              <Field label="Wedding function"><select className="w-full border rounded-lg px-3 py-2" value={editing.event_id || ""} onChange={(e) => setEditing({ ...editing, event_id: e.target.value })}><option value="">—</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
              <Field label="Booking status"><select className="w-full border rounded-lg px-3 py-2" value={editing.status || "Not Booked"} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>{BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Booking date"><input type="date" className="w-full border rounded-lg px-3 py-2" value={editing.booking_date || ""} onChange={(e) => setEditing({ ...editing, booking_date: e.target.value })} /></Field>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.contract_signed} onChange={(e) => setEditing({ ...editing, contract_signed: e.target.checked })} /> Contract signed</label>
              <Field label="Advance paid (₹)"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.advance_paid ?? 0} onChange={(e) => setEditing({ ...editing, advance_paid: Number(e.target.value) })} /></Field>
              <Field label="Balance due (₹)"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.balance_due ?? 0} onChange={(e) => setEditing({ ...editing, balance_due: Number(e.target.value) })} /></Field>
              <Field label="Final payment due date"><input type="date" className="w-full border rounded-lg px-3 py-2" value={editing.final_payment_due || ""} onChange={(e) => setEditing({ ...editing, final_payment_due: e.target.value })} /></Field>
              <Field label="Contact person"><input className="w-full border rounded-lg px-3 py-2" value={editing.contact_person || ""} onChange={(e) => setEditing({ ...editing, contact_person: e.target.value })} /></Field>
              <Field label="Phone"><input className="w-full border rounded-lg px-3 py-2" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Trial / sample date"><input type="date" className="w-full border rounded-lg px-3 py-2" value={editing.trial_date || ""} onChange={(e) => setEditing({ ...editing, trial_date: e.target.value })} /></Field>
              <Field label="Fitting date(s)"><input className="w-full border rounded-lg px-3 py-2" placeholder="e.g. 2026-12-01, 2027-01-10" value={editing.fitting_dates || ""} onChange={(e) => setEditing({ ...editing, fitting_dates: e.target.value })} /></Field>
              <Field label="Notes"><textarea rows={2} className="w-full border rounded-lg px-3 py-2" value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
            </div>
            <div className="flex justify-between mt-5">
              <div>{editing.id && <button className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white" onClick={() => remove(editing.id!)}>Delete</button>}</div>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm rounded-lg border" onClick={() => setEditing(null)}>Cancel</button>
                <button className="px-4 py-2 text-sm rounded-lg bg-emerald text-white font-semibold" onClick={save}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Metric({ label, val, danger }: { label: string; val: string | number; danger?: boolean }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`font-serif text-2xl font-semibold mt-1 ${danger ? "text-red-600" : ""}`}>{val}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase text-neutral-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
