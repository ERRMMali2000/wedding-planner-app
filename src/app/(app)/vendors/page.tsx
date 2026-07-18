"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMe } from "@/lib/useMe";
import type { Vendor } from "@/lib/types";

function fmt(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

export default function VendorsPage() {
  const supabase = createClient();
  const { isAdmin } = useMe();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [editing, setEditing] = useState<Partial<Vendor> | null>(null);

  async function load() {
    const { data } = await supabase.from("vendors").select("*").order("name");
    setVendors(data ?? []);
  }
  useEffect(() => {
    load();
    const channel = supabase
      .channel("vendors-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!editing) return;
    const payload = {
      name: editing.name || "Unnamed vendor",
      category: editing.category || "",
      phone: editing.phone || "",
      advance: Number(editing.advance) || 0,
      total: Number(editing.total) || 0,
      rating: Math.min(5, Math.max(0, Number(editing.rating) || 0)),
      notes: editing.notes || "",
    };
    if (editing.id) {
      await supabase.from("vendors").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("vendors").insert(payload);
    }
    setEditing(null);
    load();
  }
  async function remove(id: string) {
    await supabase.from("vendors").delete().eq("id", id);
    setEditing(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl font-semibold">Vendors</h1>
        {isAdmin && (
          <button className="bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-lg" onClick={() => setEditing({ name: "", category: "", advance: 0, total: 0, rating: 0 })}>
            + Add vendor
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {vendors.map((v) => (
          <div key={v.id} className="bg-white border rounded-xl p-4 flex flex-col gap-2">
            <h4 className="font-serif text-base font-semibold">{v.name}</h4>
            <div className="text-xs text-neutral-500">{v.category}</div>
            <div className="text-gold text-sm">{"★".repeat(v.rating)}{"☆".repeat(5 - v.rating)}</div>
            <div className="text-xs">Advance paid: <b>{fmt(v.advance)}</b> / {fmt(v.total)}</div>
            <div className="h-1.5 bg-neutral-200 rounded"><div className="h-full bg-emerald rounded" style={{ width: `${v.total ? Math.round((v.advance / v.total) * 100) : 0}%` }} /></div>
            <div className="text-xs text-neutral-400">{v.notes}</div>
            <div className="flex gap-2 mt-1">
              {v.phone && (
                <a href={`https://wa.me/${v.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="text-xs border rounded-full px-3 py-1">
                  WhatsApp
                </a>
              )}
              {isAdmin && <button className="text-xs border rounded-full px-3 py-1" onClick={() => setEditing(v)}>Edit</button>}
            </div>
          </div>
        ))}
        {!vendors.length && <p className="text-sm text-neutral-400 col-span-3">No vendors yet.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-[380px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg mb-4">{editing.id ? "Edit vendor" : "Add vendor"}</h3>
            <div className="space-y-3 text-sm">
              <Field label="Name"><input className="w-full border rounded-lg px-3 py-2" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Category"><input className="w-full border rounded-lg px-3 py-2" placeholder="Photographer, Decorator…" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field>
              <Field label="Phone"><input className="w-full border rounded-lg px-3 py-2" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Advance paid (₹)"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.advance ?? 0} onChange={(e) => setEditing({ ...editing, advance: Number(e.target.value) })} /></Field>
              <Field label="Total cost (₹)"><input type="number" className="w-full border rounded-lg px-3 py-2" value={editing.total ?? 0} onChange={(e) => setEditing({ ...editing, total: Number(e.target.value) })} /></Field>
              <Field label="Rating (0-5)"><input type="number" min={0} max={5} className="w-full border rounded-lg px-3 py-2" value={editing.rating ?? 0} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })} /></Field>
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase text-neutral-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
