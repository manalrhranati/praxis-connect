"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/client";

type Log = {
  id: number;
  user_id: string | null;
  practice_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
};

const ACTION_STYLE: Record<string, string> = {
  INSERT: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  DELETE: "bg-red-50 text-red-700",
};

const short = (id: string | null) => (id ? id.slice(0, 8) : "System");

export default function AuditLogPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (profile?.role !== "admin") {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);

      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data as Log[]) ?? []);
    }
    load();
  }, [supabase, router]);

  if (isAdmin === null) return null;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl p-4">
        <h1 className="mt-6 text-2xl font-bold">Audit-Log</h1>
        <p className="mt-1 text-slate-600">
          Jede Änderung an Patienten, Terminen und Nachrichten wird automatisch protokolliert.
        </p>

        {!isAdmin ? (
          <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            Kein Zugriff. Diese Seite ist nur für Admins sichtbar.
          </p>
        ) : (
          <div className="mb-8 mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Zeitpunkt</th>
                  <th className="px-4 py-3 font-medium">Aktion</th>
                  <th className="px-4 py-3 font-medium">Objekt</th>
                  <th className="px-4 py-3 font-medium">Nutzer</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      {new Date(l.created_at).toLocaleString("de-DE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ACTION_STYLE[l.action] ?? ""
                        }`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">{l.entity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {short(l.user_id)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Noch keine Einträge.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}