"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Task, TaskStatus } from "@/lib/types";
import { STATUSES } from "@/lib/types";

export default function TasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);

  async function loadAll() {
    const { data: tk } = await supabase.from("tasks").select("*").order("due_date", { ascending: true });
    const { data: pf } = await supabase.from("profiles").select("*");
    setTasks(tk ?? []);
    setProfiles(pf ?? []);
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setMe(data ?? null);
      }
      await loadAll();
    })();

    const channel = supabase
      .channel("tasks-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, loadAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const isAdmin = me?.role === "admin";

  function canEdit(t: Task) {
    return isAdmin || t.assignee === me?.id;
  }

  async function moveTask(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !canEdit(task)) return;
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) {
      // RLS rejected it (e.g. member tried to move someone else's task) — reload to reset
      await loadAll();
      alert("You can only move tasks assigned to you.");
    }
  }

  async function saveTask() {
    if (!editing) return;
    const payload = {
      name: editing.name,
      category: editing.category,
      assignee: editing.assignee,
      priority: editing.priority,
      status: editing.status,
      due_date: editing.due_date,
    };
    if (editing.id) {
      await supabase.from("tasks").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("tasks").insert(payload as any);
    }
    setEditing(null);
    loadAll();
  }

  function profileName(id: string | null) {
    return profiles.find((p) => p.id === id)?.full_name ?? "Unassigned";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl font-semibold">Tasks</h1>
        {isAdmin && (
          <button
            className="bg-emerald text-white text-sm font-semibold px-4 py-2 rounded-lg"
            onClick={() =>
              setEditing({
                id: "",
                event_id: "",
                name: "",
                description: "",
                category: "",
                assignee: null,
                priority: "Medium",
                status: "Not Started",
                due_date: null,
                completion_pct: 0,
              })
            }
          >
            + Add task
          </button>
        )}
      </div>

      <div className="grid grid-cols-6 gap-3 overflow-x-auto">
        {STATUSES.map((status) => (
          <div
            key={status}
            className="bg-white border border-neutral-200 rounded-xl p-2 min-h-[120px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("id");
              moveTask(id, status);
            }}
          >
            <h4 className="text-[11px] uppercase tracking-wide text-neutral-400 px-1 mb-2">
              {status} ({tasks.filter((t) => t.status === status).length})
            </h4>
            {tasks
              .filter((t) => t.status === status)
              .map((t) => (
                <div
                  key={t.id}
                  draggable={canEdit(t)}
                  onDragStart={(e) => e.dataTransfer.setData("id", t.id)}
                  onClick={() => canEdit(t) && setEditing(t)}
                  className={`bg-ivory border border-neutral-200 rounded-lg p-2 mb-2 text-xs ${
                    canEdit(t) ? "cursor-grab" : "cursor-not-allowed opacity-70"
                  }`}
                  title={canEdit(t) ? "" : "Only the assignee or an admin can edit this task"}
                >
                  <div className="font-semibold mb-1">{t.name}</div>
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>{profileName(t.assignee)}</span>
                    <span>{t.priority}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString("en-IN") : "No due date"}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-[420px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg mb-4">{editing.id ? "Edit task" : "Add task"}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-[11px] uppercase text-neutral-500">Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase text-neutral-500">Assignee</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={editing.assignee ?? ""}
                  onChange={(e) => setEditing({ ...editing, assignee: e.target.value || null })}
                  disabled={!isAdmin}
                >
                  <option value="">Unassigned</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase text-neutral-500">Priority</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={editing.priority}
                  onChange={(e) => setEditing({ ...editing, priority: e.target.value as any })}
                >
                  {["Critical", "High", "Medium", "Low"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase text-neutral-500">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase text-neutral-500">Due date</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={editing.due_date ?? ""}
                  onChange={(e) => setEditing({ ...editing, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="px-4 py-2 text-sm rounded-lg border" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="px-4 py-2 text-sm rounded-lg bg-emerald text-white font-semibold" onClick={saveTask}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
