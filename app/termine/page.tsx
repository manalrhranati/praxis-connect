"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <main className="mx-auto mt-16 max-w-2xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Termine</h1>
        <Link href="/dashboard" className="text-sm text-blue-600 underline">
          Zum Dashboard
        </Link>
      </div>

      <form onSubmit={addAppointment} className="mb-8 flex flex-col gap-3 rounded border p-4">
        <h2 className="font-semibold">Neuer Termin</h2>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="rounded border p-2"
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
          className="rounded border p-2"
          required
        />
        <input
          type="text"
          placeholder="Grund (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded border p-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded bg-blue-600 p-2 text-white">Termin anlegen</button>
      </form>

      <ul className="flex flex-col gap-2">
        {appointments.length === 0 && <li className="text-gray-500">Noch keine Termine.</li>}
        {appointments.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-4 rounded border p-3">
            <div>
              <p className="font-medium">{a.patients?.display_name ?? "Unbekannt"}</p>
              <p className="text-sm text-gray-600">
                {new Date(a.starts_at).toLocaleString("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {a.reason ? ` · ${a.reason}` : ""}
              </p>
              <p className="text-xs text-gray-500">{STATUS_LABEL[a.status] ?? a.status}</p>
            </div>
            {a.status !== "cancelled" && (
              <button
                onClick={() => cancelAppointment(a.id)}
                className="rounded border px-3 py-1 text-sm"
              >
                Absagen
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}