"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMe } from "@/lib/useMe";
import type { EventRow, BudgetExpense } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}
const PIE_COLORS = ["#0B4D3C", "#C9A227", "#6B7A3A", "#E8A33D", "#C9A96E", "#C1483F", "#146B54"];

export default function BudgetPage() {
  const supabase = createClient();
  const { isAdmin } = useMe();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [editing, setEditing] = useState<Partial<BudgetExpense> | null>(null);

  async function load() {
    const { data: ev } = await supabase.from("events").select("*").eq("archived", false);
    const { data: bx } = await supabase.from("budget_expenses").select("*").order("created_at", { ascending: false });
    setEvents(ev ?? []);
    setExpenses(bx ?? []);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("budget-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_expenses" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function eventName(id: string) {
    return events.find((e) => e.id === id)?.name ?? "—";
  }

  const totalBudgeted = expenses.reduce((a, b) => a + Number(b.budgeted), 0);
  const totalActual = expenses.reduce((a, b) => a + Number(b.actual), 0);
  const pctSpent = totalBudgeted ? Math.round((totalActual / totalBudgeted) * 100) : 0;

  const byEvent = events.map((e) => {
    const items = expenses.filter((x) => x.event_id === e.id);
    return {
      name: e.name,
      Budgeted: items.reduce((a, b) => a + Number(b.budgeted), 0),
      Actual: items.reduce((a, b) => a + Number(b.actual), 0),
    };
  });

  const catMap: Record<string, number> = {};
  expenses.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.actual); });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  async function save() {
    if (!editing) return;
    const payload = {
      item: editing.item || "Untitled expense",
      event_id: editing.event_id,
      category: editing.category || "Other",
      vendor: editing.vendor || "",
      budgeted: Number(editing.budgeted) || 0,
      actual: Number(editing.actual) || 0,
      paid: !!editing.paid,
    };
    if (editing.id) {
      await supabase.from("budget_expenses").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("budget_expenses").insert(payload);
    }
    setEditing(null);
    load();
  }
  async function remove(id: string) {
    await supabase.from("budget_expenses").delete().eq("id", id);
    setEditing(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl font-semibold">Budget</h1>
        {isAdmin && (
          <button
            className="bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-lg"
            onClick={() => setEditing({ item: "", event_id: events[0]?.id, category: "", budgeted: 0, actual: 0, paid: false })}
          >
            + Add expense
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Metric label="Total budgeted" val={fmt(totalBudgeted)} />
        <Metric label="Total spent" val={fmt(totalActual)} />
        <Metric label="Remaining" val={fmt(totalBudgeted - totalActual)} />
        <Metric label="% spent" val={pctSpent + "%"} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-neutral-500 mb-2">Budget vs actual by event</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byEvent}>
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="Budgeted" fill="#C9A96E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#0B4D3C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-neutral-500 mb-2">Spend by category</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold mb-3">Expense history</h2>
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-400 border-b">
              <th className="p-2">Item</th><th className="p-2">Event</th><th className="p-2">Category</th><th className="p-2">Vendor</th>
              <th className="p-2">Budgeted</th><th className="p-2">Actual</th><th className="p-2">Paid</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="p-2">{b.item}</td>
                <td className="p-2">{eventName(b.event_id)}</td>
                <td className="p-2">{b.category}</td>
                <td className="p-2">{b.vendor || "—"}</td>
                <td className="p-2">{fmt(b.budgeted)}</td>
                <td className="p-2">{fmt(b.actual)}</td>
                <td className="p-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.paid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"}`}>
                    {b.paid ? "Paid" : "Pending"}
                  </span>
                </td>
                <td className="p-2">{isAdmin && <button className="text-xs border rounded-full px-3 py-1" onClick={() => setEditing(b)}>Edit</button>}</td>
              </tr>
            ))}
            {!expenses.length && <tr><td colSpan={8} className="p-6 text-center text-neutral-400">No expenses logged yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-[420px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg mb-4">{editing.id ? "Edit expense" : "Add expense"}</h3>
            <div className="space-y-3 text-sm">
              <Field label="Item"><input className="w-full border rounded-lg px-3 py-2" value={editing.item || ""} onChange={(e) => setEditing({ ...editing, item: e.target.value })} /></Field>
              <Field label="Event"><select className="w-full border rounded-lg px-3 py-2" value={editing.event_id || ""} onChange={(e) => setEditing({ ...editing, event_id: e.target.value })}>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
              <Field label="Category"><input className="w-full border rounded-lg px-3 py-2" placeholder="Venue, Catering, Decor…" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field>
              <Field label="Vendor"><input className="w-full border rounded-lg px-3 py-2" value={editing.vendor || ""} onChange={(e) => setEditing({ ...editing, vendor: e.target.value })} /></Field>
              <Field label="Budgeted (₹)"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.budgeted ?? 0} onChange={(e) => setEditing({ ...editing, budgeted: Number(e.target.value) })} /></Field>
              <Field label="Actual (₹)"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.actual ?? 0} onChange={(e) => setEditing({ ...editing, actual: Number(e.target.value) })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.paid} onChange={(e) => setEditing({ ...editing, paid: e.target.checked })} /> Paid</label>
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

function Metric({ label, val }: { label: string; val: string }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-serif text-2xl font-semibold mt-1">{val}</div>
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
