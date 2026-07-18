"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMe } from "@/lib/useMe";
import type { EventRow, Task } from "@/lib/types";

const THEME_GRADIENT: Record<string, string> = {
  mehendi: "from-[#5C6B31] to-[#8AA04A]",
  haldi: "from-[#D98A2B] to-[#F0BE5C]",
  nikah: "from-emerald to-gold",
  reception: "from-[#8A7440] to-champagne",
  default: "from-neutral-500 to-neutral-400",
};

export default function EventsPage() {
  const supabase = createClient();
  const { isAdmin } = useMe();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [theme, setTheme] = useState("mehendi");

  async function load() {
    const { data: ev } = await supabase.from("events").select("*").eq("archived", false).order("event_date");
    const { data: tk } = await supabase.from("tasks").select("*");
    setEvents(ev ?? []);
    setTasks(tk ?? []);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("events-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function progress(eventId: string) {
    const evTasks = tasks.filter((t) => t.event_id === eventId);
    if (!evTasks.length) return 0;
    return Math.round((evTasks.filter((t) => t.status === "Completed").length / evTasks.length) * 100);
  }

  async function addEvent() {
    if (!name.trim()) return;
    await supabase.from("events").insert({ name: name.trim(), event_date: date || "2027-01-29", theme });
    setName("");
    setDate("");
    setShowForm(false);
    load();
  }

  async function archiveEvent(id: string) {
    if (!confirm("Archive this event? Its tasks and data stay saved but it's hidden from active views.")) return;
    await supabase.from("events").update({ archived: true }).eq("id", id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl font-semibold">Wedding events</h1>
        {isAdmin && (
          <button className="bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-lg" onClick={() => setShowForm(true)}>
            + Add event
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {events.map((e) => {
          const pct = progress(e.id);
          const taskCount = tasks.filter((t) => t.event_id === e.id).length;
          return (
            <div key={e.id} className={`relative rounded-2xl p-4 text-white bg-gradient-to-br ${THEME_GRADIENT[e.theme] ?? THEME_GRADIENT.default}`}>
              {isAdmin && (
                <button
                  className="absolute top-2 right-2 bg-black/25 hover:bg-black/40 w-6 h-6 rounded-full text-xs"
                  onClick={() => archiveEvent(e.id)}
                  title="Archive event"
                >
                  ✕
                </button>
              )}
              <h3 className="font-serif text-lg">{e.name}</h3>
              <div className="text-[11px] opacity-90">
                {new Date(e.event_date).toLocaleDateString("en-IN")} · {taskCount} tasks
              </div>
              <div className="font-serif text-2xl mt-2">{pct}%</div>
              <div className="h-1.5 bg-white/30 rounded mt-1">
                <div className="h-full bg-white rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {!events.length && <p className="text-sm text-neutral-400 col-span-4">No events yet — add your first one.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-[380px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg mb-4">Add wedding event</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-[11px] uppercase text-neutral-500">Event name</label>
                <input className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="e.g. Sangeet" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] uppercase text-neutral-500">Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] uppercase text-neutral-500">Theme</label>
                <select className="w-full border rounded-lg px-3 py-2 mt-1" value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="mehendi">Mehendi (henna green)</option>
                  <option value="haldi">Haldi (marigold)</option>
                  <option value="nikah">Nikah (emerald/gold)</option>
                  <option value="reception">Reception (champagne)</option>
                  <option value="default">Custom</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="px-4 py-2 text-sm rounded-lg border" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="px-4 py-2 text-sm rounded-lg bg-emerald text-white font-semibold" onClick={addEvent}>Add event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
