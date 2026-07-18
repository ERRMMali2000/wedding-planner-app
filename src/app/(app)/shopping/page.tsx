"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMe } from "@/lib/useMe";
import type { EventRow, ShoppingItem, Profile } from "@/lib/types";
import { SHOP_CATEGORIES } from "@/lib/types";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

export default function ShoppingPage() {
  const supabase = createClient();
  const { isAdmin } = useMe();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editing, setEditing] = useState<Partial<ShoppingItem> | null>(null);
  const [filterEvent, setFilterEvent] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  async function load() {
    const { data: ev } = await supabase.from("events").select("*").eq("archived", false);
    const { data: it } = await supabase.from("shopping_items").select("*").order("name");
    const { data: pf } = await supabase.from("profiles").select("*");
    setEvents(ev ?? []);
    setItems(it ?? []);
    setProfiles(pf ?? []);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("shopping-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function eventName(id: string | null) {
    return events.find((e) => e.id === id)?.name ?? "—";
  }
  function profileName(id: string | null) {
    return profiles.find((p) => p.id === id)?.full_name ?? "Unassigned";
  }

  const filtered = items.filter(
    (i) =>
      (!filterEvent || i.event_id === filterEvent) &&
      (!filterCat || i.category === filterCat) &&
      (!filterStatus || (filterStatus === "purchased" ? i.purchased : !i.purchased))
  );

  async function togglePurchased(id: string, val: boolean) {
    await supabase.from("shopping_items").update({ purchased: val }).eq("id", id);
    load();
  }

  async function save() {
    if (!editing) return;
    const payload = {
      name: editing.name || "Untitled item",
      event_id: editing.event_id,
      category: editing.category || "Other",
      qty: Number(editing.qty) || 1,
      budget: Number(editing.budget) || 0,
      actual: Number(editing.actual) || 0,
      store: editing.store || "",
      assignee: editing.assignee || null,
    };
    if (editing.id) {
      await supabase.from("shopping_items").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("shopping_items").insert({ ...payload, purchased: false });
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    await supabase.from("shopping_items").delete().eq("id", id);
    setEditing(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl font-semibold">Shopping list</h1>
        {isAdmin && (
          <button
            className="bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-lg"
            onClick={() => setEditing({ name: "", event_id: events[0]?.id, category: SHOP_CATEGORIES[0], qty: 1, budget: 0, actual: 0 })}
          >
            + Add item
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
          <option value="">All events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {SHOP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="purchased">Purchased</option>
        </select>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-400 border-b">
              <th className="p-2"></th><th className="p-2">Item</th><th className="p-2">Event</th><th className="p-2">Category</th>
              <th className="p-2">Qty</th><th className="p-2">Budget</th><th className="p-2">Actual</th><th className="p-2">Assignee</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="p-2"><input type="checkbox" checked={i.purchased} onChange={(e) => togglePurchased(i.id, e.target.checked)} /></td>
                <td className={`p-2 ${i.purchased ? "line-through text-neutral-400" : ""}`}>{i.name}</td>
                <td className="p-2">{eventName(i.event_id)}</td>
                <td className="p-2">{i.category}</td>
                <td className="p-2">{i.qty}</td>
                <td className="p-2">{fmt(i.budget)}</td>
                <td className="p-2">{fmt(i.actual)}</td>
                <td className="p-2">{profileName(i.assignee)}</td>
                <td className="p-2">{isAdmin && <button className="text-xs border rounded-full px-3 py-1" onClick={() => setEditing(i)}>Edit</button>}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="p-6 text-center text-neutral-400">No items match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-[420px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg mb-4">{editing.id ? "Edit item" : "Add shopping item"}</h3>
            <div className="space-y-3 text-sm">
              <Field label="Item name"><input className="w-full border rounded-lg px-3 py-2" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Event"><select className="w-full border rounded-lg px-3 py-2" value={editing.event_id || ""} onChange={(e) => setEditing({ ...editing, event_id: e.target.value })}>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
              <Field label="Category"><select className="w-full border rounded-lg px-3 py-2" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{SHOP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Quantity"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.qty ?? 1} onChange={(e) => setEditing({ ...editing, qty: Number(e.target.value) })} /></Field>
              <Field label="Budget (₹)"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.budget ?? 0} onChange={(e) => setEditing({ ...editing, budget: Number(e.target.value) })} /></Field>
              <Field label="Actual (₹)"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.actual ?? 0} onChange={(e) => setEditing({ ...editing, actual: Number(e.target.value) })} /></Field>
              <Field label="Store"><input className="w-full border rounded-lg px-3 py-2" value={editing.store || ""} onChange={(e) => setEditing({ ...editing, store: e.target.value })} /></Field>
              <Field label="Assignee">
                <select className="w-full border rounded-lg px-3 py-2" value={editing.assignee || ""} onChange={(e) => setEditing({ ...editing, assignee: e.target.value || null })}>
                  <option value="">Unassigned</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase text-neutral-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
