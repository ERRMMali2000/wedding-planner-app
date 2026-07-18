"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, Task, Booking, BudgetExpense, Guest } from "@/lib/types";
import { leadFor } from "@/lib/types";
import { motion } from "framer-motion";

const WEDDING_DATE = new Date(process.env.NEXT_PUBLIC_WEDDING_DATE || "2027-01-29");
const PLANNING_START = new Date("2025-06-01");

const THEME_GRADIENT: Record<string, string> = {
  mehendi: "from-[#5C6B31] to-[#8AA04A]",
  haldi: "from-[#D98A2B] to-[#F0BE5C]",
  nikah: "from-emerald to-gold",
  reception: "from-[#8A7440] to-champagne",
  default: "from-neutral-500 to-neutral-400",
};

function bookingOverdue(b: Booking) {
  if (["Booked", "Confirmed", "Cancelled"].includes(b.status)) return false;
  const idealBy = new Date(WEDDING_DATE.getTime() - leadFor(b.category) * 86400000);
  return idealBy.getTime() < Date.now();
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [budget, setBudget] = useState<BudgetExpense[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: tk }, { data: bk }, { data: bx }, { data: gs }] = await Promise.all([
        supabase.from("events").select("*").eq("archived", false),
        supabase.from("tasks").select("*"),
        supabase.from("bookings").select("*"),
        supabase.from("budget_expenses").select("*"),
        supabase.from("guests").select("*"),
      ]);
      setEvents(ev ?? []);
      setTasks(tk ?? []);
      setBookings(bk ?? []);
      setBudget(bx ?? []);
      setGuests(gs ?? []);
    }
    load();

    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_expenses" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const daysLeft = Math.max(0, Math.ceil((WEDDING_DATE.getTime() - now.getTime()) / 86400000));
  const weeksLeft = Math.floor(daysLeft / 7);
  const totalPlanDays = Math.ceil((WEDDING_DATE.getTime() - PLANNING_START.getTime()) / 86400000);
  const elapsedPct = Math.min(100, Math.max(0, Math.round((1 - daysLeft / totalPlanDays) * 100)));

  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const overallPct = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const bookedCount = bookings.filter((b) => ["Booked", "Confirmed"].includes(b.status)).length;
  const bookingPct = bookings.length ? Math.round((bookedCount / bookings.length) * 100) : 0;

  const totalBudgeted = budget.reduce((a, b) => a + Number(b.budgeted), 0);
  const totalActual = budget.reduce((a, b) => a + Number(b.actual), 0);
  const budgetPct = totalBudgeted ? Math.round((totalActual / totalBudgeted) * 100) : 0;

  const rsvpPct = guests.length ? Math.round((guests.filter((g) => g.rsvp === "Confirmed").length / guests.length) * 100) : 0;

  const overdueBookings = bookings.filter(bookingOverdue);

  const urgent = [...tasks]
    .filter((t) => t.status !== "Completed" && t.status !== "Cancelled" && t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 6);

  function eventProgress(eventId: string) {
    const evTasks = tasks.filter((t) => t.event_id === eventId);
    if (!evTasks.length) return 0;
    return Math.round((evTasks.filter((t) => t.status === "Completed").length / evTasks.length) * 100);
  }

  function urgencyOf(dueDate: string | null, status: string) {
    if (status === "Completed" || status === "Cancelled") return { label: "Done", color: "text-emerald" };
    if (!dueDate) return { label: "No date", color: "text-neutral-400" };
    const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / 86400000);
    if (days < 0) return { label: "Overdue", color: "text-red-600" };
    if (days <= 3) return { label: "Critical", color: "text-red-600" };
    if (days <= 10) return { label: "Urgent", color: "text-orange-500" };
    if (days <= 30) return { label: "Upcoming", color: "text-yellow-600" };
    return { label: "Can wait", color: "text-emerald" };
  }

  const ringSize = 128;
  const stroke = 11;
  const r = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (elapsedPct / 100) * circumference;

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-1">Welcome back</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").length} tasks left across{" "}
        {events.length} events.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-6 bg-gradient-to-br from-emerald to-emerald-light rounded-2xl p-7 text-white mb-6"
      >
        <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={stroke} />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              fill="none"
              stroke="#C9A227"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset .6s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-serif text-3xl font-bold">{daysLeft}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-85">days left</div>
          </div>
        </div>
        <div>
          <h2 className="font-serif text-xl mb-1">Countdown to the wedding</h2>
          <p className="text-sm opacity-90">
            {WEDDING_DATE.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="flex gap-6 mt-3">
            <div><b className="font-serif text-lg block">{weeksLeft}</b><span className="text-[11px] uppercase opacity-85">weeks left</span></div>
            <div><b className="font-serif text-lg block">{elapsedPct}%</b><span className="text-[11px] uppercase opacity-85">time elapsed</span></div>
            <div><b className="font-serif text-lg block">{overallPct}%</b><span className="text-[11px] uppercase opacity-85">tasks done</span></div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Metric label="Overall completion" val={`${overallPct}%`} bar={overallPct} />
        <Metric label="Vendors booked" val={`${bookingPct}%`} bar={bookingPct} />
        <Metric label="Budget spent" val={`${budgetPct}%`} bar={budgetPct} />
        <Metric label="RSVPs confirmed" val={`${rsvpPct}%`} bar={rsvpPct} />
      </div>

      <h2 className="text-sm font-semibold mb-3">Event progress</h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {events.map((e) => {
          const pct = eventProgress(e.id);
          return (
            <div key={e.id} className={`rounded-2xl p-4 text-white bg-gradient-to-br ${THEME_GRADIENT[e.theme] ?? THEME_GRADIENT.default}`}>
              <h3 className="font-serif text-lg">{e.name}</h3>
              <div className="text-[11px] opacity-90">{new Date(e.event_date).toLocaleDateString("en-IN")}</div>
              <div className="font-serif text-2xl mt-2">{pct}%</div>
              <div className="h-1.5 bg-white/30 rounded mt-1">
                <div className="h-full bg-white rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {!events.length && <p className="text-sm text-neutral-400 col-span-4">No events yet.</p>}
      </div>

      {overdueBookings.length > 0 && (
        <div className="border border-red-300 bg-red-50 rounded-xl p-4 mb-6">
          <div className="font-semibold text-red-600 mb-2">
            ⚠ {overdueBookings.length} booking{overdueBookings.length > 1 ? "s are" : " is"} overdue — past the ideal booking window
          </div>
          <div className="flex flex-col gap-2">
            {overdueBookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2 text-sm">
                <span className="flex-1 font-medium">{b.category}{b.vendor_name ? " — " + b.vendor_name : " — not booked yet"}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Overdue</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold mb-3">Urgent tasks</h2>
      <div className="flex flex-col gap-2">
        {urgent.map((t) => {
          const u = urgencyOf(t.due_date, t.status);
          return (
            <div key={t.id} className="flex items-center gap-3 border border-neutral-200 rounded-lg px-3 py-2 bg-white text-sm">
              <span className="flex-1 font-medium">{t.name}</span>
              <span className="text-xs text-neutral-400">{t.due_date ? new Date(t.due_date).toLocaleDateString("en-IN") : "—"}</span>
              <span className={`text-xs font-semibold ${u.color}`}>{u.label}</span>
            </div>
          );
        })}
        {!urgent.length && <p className="text-sm text-neutral-400">Nothing urgent — nicely done.</p>}
      </div>
    </div>
  );
}

function Metric({ label, val, bar }: { label: string; val: string; bar: number }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-serif text-2xl font-semibold mt-1">{val}</div>
      <div className="h-1.5 bg-neutral-200 rounded mt-2">
        <div className="h-full bg-gradient-to-r from-emerald to-gold rounded" style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}
