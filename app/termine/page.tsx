"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/client";

type Patient = { id: string; display_name: string };
type Appointment = {
  id: string;
  starts_at: string;
  status: string;
  reason: string | null;
  patients: { display_name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Geplant",
  confirmed: "Bestätigt",
  cancelled: "Abgesagt",
  done: "Erledigt",
};

const STATUS_STYLE: Record<string, string> = {
  planned: "bg-blue-50 text-blue-700",
  confirmed: "bg-green-50 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
  done: "bg-emerald-50 text-emerald-700",
};

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const primary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700";

export default function TerminePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientId, setPatientId] = useState("");
  const [start, setStart] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
    setPracticeId(profile?.practice_id ?? null);

    const { data: pats } = await supabase
      .from("patients")
      .select("id, display_name")
      .order("display_name");
    setPatients(pats ?? []);

    const { data: apps, error } = await supabase
      .from("appointments")
      .select("id, starts_at, status, reason, patients(display_name)")
      .order("starts_at");
    if (error) setError(error.message);
    setAppointments((apps as unknown as Appointment[]) ?? []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addAppointment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!practiceId) {
      setError("Deinem Profil ist noch keine Praxis zugewiesen.");
      return;
    }

    const startsAt = new Date(start);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const { error } = await supabase.from("appointments").insert({
      practice_id: practiceId,
      patient_id: patientId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reason: reason || null,
    });

    if (error) {
      setError(error.message);
      return;
    }
    setStart("");
    setReason("");
    load();
  }

  async function cancelAppointment(id: string) {
    setError(null);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) setError(error.message);
    load();
  }

  if (loading) return null;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl p-4">
        <h1 className="mt-6 text-2xl font-bold">Termine</h1>
        <p className="mt-1 text-slate-600">Neue Termine anlegen und bestehende verwalten.</p>

        <form
          onSubmit={addAppointment}
          className="mt-6 grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-2"
        >
          <h2 className="font-semibold md:col-span-2">Neuer Termin</h2>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className={input}
            required
          >
            <option value="">Patient wählen…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={input}
            required
          />
          <input
            type="text"
            placeholder="Grund (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${input} md:col-span-2`}
          />
          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
          <button className={`${primary} md:col-span-2`}>Termin anlegen</button>
        </form>

        <h2 className="mb-3 mt-8 font-semibold">Alle Termine</h2>
        <ul className="flex flex-col gap-3 pb-8">
          {appointments.length === 0 && (
            <li className="rounded-xl border border-dashed bg-white p-6 text-center text-slate-500">
              Noch keine Termine.
            </li>
          )}
          {appointments.map((a) => (
            <li
              key={a.id}
              className={`flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                a.status === "cancelled" ? "opacity-60" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{a.patients?.display_name ?? "Unbekannt"}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[a.status] ?? ""
                    }`}
                  >
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {new Date(a.starts_at).toLocaleString("de-DE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
              </div>
              {a.status !== "cancelled" && (
                <button
                  onClick={() => cancelAppointment(a.id)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Absagen
                </button>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}