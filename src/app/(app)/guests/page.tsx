"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMe } from "@/lib/useMe";
import type { Guest } from "@/lib/types";

export default function GuestsPage() {
  const supabase = createClient();
  const { isAdmin } = useMe();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [editing, setEditing] = useState<Partial<Guest> | null>(null);
  const [side, setSide] = useState("");
  const [group, setGroup] = useState("");
  const [rsvp, setRsvp] = useState("");

  async function load() {
    const { data } = await supabase.from("guests").select("*").order("name");
    setGuests(data ?? []);
  }
  useEffect(() => {
    load();
    const channel = supabase
      .channel("guests-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = guests.filter(
    (g) => (!side || g.side === side) && (!group || g.group_name === group) && (!rsvp || g.rsvp === rsvp)
  );
  const confirmed = guests.filter((g) => g.rsvp === "Confirmed").length;
  const pending = guests.filter((g) => g.rsvp === "Pending").length;
  const declined = guests.filter((g) => g.rsvp === "Declined").length;

  async function save() {
    if (!editing) return;
    const payload = {
      name: editing.name || "Unnamed guest",
      side: editing.side || "Bride",
      group_name: editing.group_name || "Friends",
      rsvp: editing.rsvp || "Pending",
      food_pref: editing.food_pref || "Veg",
      phone: editing.phone || "",
      invited: editing.invited ?? true,
    };
    if (editing.id) {
      await supabase.from("guests").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("guests").insert(payload);
    }
    setEditing(null);
    load();
  }
  async function remove(id: string) {
    await supabase.from("guests").delete().eq("id", id);
    setEditing(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl font-semibold">Guests</h1>
        {isAdmin && (
          <button className="bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-lg" onClick={() => setEditing({ side: "Bride", group_name: "Friends", rsvp: "Pending", food_pref: "Veg", invited: true })}>
            + Add guest
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <Metric label="Total guests" val={guests.length} />
        <Metric label="Confirmed" val={confirmed} />
        <Metric label="Pending" val={pending} />
        <Metric label="Declined" val={declined} />
      </div>

      <div className="flex gap-2 mb-4">
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="">Both sides</option><option>Bride</option><option>Groom</option>
        </select>
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All groups</option><option>Family</option><option>Friends</option><option>VIP</option>
        </select>
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={rsvp} onChange={(e) => setRsvp(e.target.value)}>
          <option value="">All RSVP</option><option>Pending</option><option>Confirmed</option><option>Declined</option>
        </select>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-400 border-b">
              <th className="p-2">Name</th><th className="p-2">Side</th><th className="p-2">Group</th><th className="p-2">RSVP</th>
              <th className="p-2">Invited</th><th className="p-2">Food</th><th className="p-2">Phone</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => {
              const badge = { Confirmed: "bg-green-100 text-green-700", Pending: "bg-yellow-100 text-yellow-700", Declined: "bg-red-100 text-red-600" }[g.rsvp];
              return (
                <tr key={g.id} className="border-b last:border-0">
                  <td className="p-2">{g.name}</td>
                  <td className="p-2">{g.side}</td>
                  <td className="p-2">{g.group_name}</td>
                  <td className="p-2"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{g.rsvp}</span></td>
                  <td className="p-2">{g.invited ? "Yes" : "No"}</td>
                  <td className="p-2">{g.food_pref}</td>
                  <td className="p-2">{g.phone || "—"}</td>
                  <td className="p-2">{isAdmin && <button className="text-xs border rounded-full px-3 py-1" onClick={() => setEditing(g)}>Edit</button>}</td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={8} className="p-6 text-center text-neutral-400">No guests match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-[380px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg mb-4">{editing.id ? "Edit guest" : "Add guest"}</h3>
            <div className="space-y-3 text-sm">
              <Field label="Name"><input className="w-full border rounded-lg px-3 py-2" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Side"><select className="w-full border rounded-lg px-3 py-2" value={editing.side || "Bride"} onChange={(e) => setEditing({ ...editing, side: e.target.value as any })}><option>Bride</option><option>Groom</option></select></Field>
              <Field label="Group"><select className="w-full border rounded-lg px-3 py-2" value={editing.group_name || "Friends"} onChange={(e) => setEditing({ ...editing, group_name: e.target.value as any })}><option>Family</option><option>Friends</option><option>VIP</option></select></Field>
              <Field label="RSVP"><select className="w-full border rounded-lg px-3 py-2" value={editing.rsvp || "Pending"} onChange={(e) => setEditing({ ...editing, rsvp: e.target.value as any })}><option>Pending</option><option>Confirmed</option><option>Declined</option></select></Field>
              <Field label="Food preference"><select className="w-full border rounded-lg px-3 py-2" value={editing.food_pref || "Veg"} onChange={(e) => setEditing({ ...editing, food_pref: e.target.value as any })}><option>Veg</option><option>Non-Veg</option><option>Vegan</option></select></Field>
              <Field label="Phone"><input className="w-full border rounded-lg px-3 py-2" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.invited ?? true} onChange={(e) => setEditing({ ...editing, invited: e.target.checked })} /> Invitation sent</label>
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
function Metric({ label, val }: { label: string; val: string | number }) {
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
