"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/events", label: "Events", icon: "💍" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/shopping", label: "Shopping", icon: "🛍️" },
  { href: "/budget", label: "Budget", icon: "💰" },
  { href: "/guests", label: "Guests", icon: "👥" },
  { href: "/vendors", label: "Vendors", icon: "🤝" },
  { href: "/bookings", label: "Bookings", icon: "📋" },
];

export default function Sidebar({ fullName, role }: { fullName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-[230px] shrink-0 bg-emerald text-[#F3EFE4] flex flex-col p-4 sticky top-0 h-screen">
      <div className="pb-5 mb-4 border-b border-white/15">
        <div className="font-serif text-lg font-semibold text-white">Roshan &amp; Priyanka</div>
        <div className="text-[11px] uppercase tracking-wide text-gold-light mt-1">Wedding Planner</div>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition ${
              pathname === n.href ? "bg-gold text-[#2A2408] font-semibold" : "hover:bg-white/10"
            }`}
          >
            <span>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/15 pt-3 mt-3 text-xs">
        <div className="mb-2">
          <div className="font-medium">{fullName}</div>
          <div className="text-gold-light uppercase text-[10px]">{role}</div>
        </div>
        <button onClick={signOut} className="w-full bg-white/10 hover:bg-white/20 rounded-lg py-2 transition">
          Sign out
        </button>
      </div>
    </div>
  );
}
