"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/client";

type Appt = { starts_at: string; status: string };
type Stats = {
  today: number;
  week: number;
  cancelRate: number;
  unread: number;
  chart: { tag: string; Termine: number }[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function computeStats(appts: Appt[], unread: number): Stats {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const weekEnd = addDays(weekStart, 7);

  const active = appts.filter((a) => a.status !== "cancelled");
  const inRange = (a: Appt, from: Date, to: Date) => {
    const t = new Date(a.starts_at);
    return t >= from && t < to;
  };
  const cancelled = appts.length - active.length;

  const chart = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    return {
      tag: day.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit" }),
      Termine: active.filter((a) => inRange(a, day, addDays(day, 1))).length,
    };
  });

  return {
    today: active.filter((a) => inRange(a, today, tomorrow)).length,
    week: active.filter((a) => inRange(a, weekStart, weekEnd)).length,
    cancelRate: appts.length ? Math.round((cancelled / appts.length) * 100) : 0,
    unread,
    chart,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("practice_id")
        .eq("id", userData.user.id)
        .single();

      const { data: appts } = await supabase.from("appointments").select("starts_at, status");

      let unread = 0;
      if (profile?.practice_id) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_practice_id", profile.practice_id)
          .is("read_at", null);
        unread = count ?? 0;
      }

      setStats(computeStats((appts as Appt[]) ?? [], unread));
    }
    load();
  }, [supabase, router]);

  if (!stats) return null;

  const cards = [
    { label: "Termine heute", value: stats.today, href: "/termine" },
    { label: "Termine diese Woche", value: stats.week, href: "/termine" },
    { label: "Absagequote", value: `${stats.cancelRate} %`, href: "/termine" },
    { label: "Ungelesene Nachrichten", value: stats.unread, href: "/nachrichten" },
  ];

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl p-4">
        <h1 className="mt-6 text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-slate-600">Der aktuelle Stand deiner Praxis auf einen Blick.</p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow"
            >
              <p className="text-sm text-slate-600">{c.label}</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{c.value}</p>
            </Link>
          ))}
        </div>

        <div className="mb-8 mt-6 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Termine der nächsten 7 Tage</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tag" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Termine" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </>
  );
}