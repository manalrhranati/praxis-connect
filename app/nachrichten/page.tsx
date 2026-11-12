"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Practice = { id: string; name: string };
type Message = {
  id: string;
  sender_practice_id: string;
  recipient_practice_id: string;
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export default function NachrichtenPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
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

    const { data: prs } = await supabase.from("practices").select("id, name").order("name");
    setPractices(prs ?? []);

    const { data: msgs, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setMessages((msgs as Message[]) ?? []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (id: string) => practices.find((p) => p.id === id)?.name ?? "Unbekannt";
  const inbox = messages.filter((m) => m.recipient_practice_id === practiceId);
  const sent = messages.filter((m) => m.sender_practice_id === practiceId);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!practiceId) {
      setError("Deinem Profil ist noch keine Praxis zugewiesen.");
      return;
    }
    const { error } = await supabase.from("messages").insert({
      sender_practice_id: practiceId,
      recipient_practice_id: recipient,
      subject,
      body,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setSubject("");
    setBody("");
    load();
  }

  async function markRead(id: string) {
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setError(error.message);
    load();
  }

  if (loading) return null;

  const fmt = (d: string) =>
    new Date(d).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="mx-auto mt-16 max-w-2xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nachrichten</h1>
        <Link href="/dashboard" className="text-sm text-blue-600 underline">
          Zum Dashboard
        </Link>
      </div>

      <form onSubmit={send} className="mb-8 flex flex-col gap-3 rounded border p-4">
        <h2 className="font-semibold">Neue Nachricht</h2>
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="rounded border p-2"
          required
        >
          <option value="">Empfänger-Praxis wählen…</option>
          {practices
            .filter((p) => p.id !== practiceId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <input
          type="text"
          placeholder="Betreff"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded border p-2"
          required
        />
        <textarea
          placeholder="Nachricht (nur Testdaten, keine echten Patientendaten)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-24 rounded border p-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded bg-blue-600 p-2 text-white">Senden</button>
      </form>

      <h2 className="mb-2 font-semibold">Posteingang</h2>
      <ul className="mb-8 flex flex-col gap-2">
        {inbox.length === 0 && <li className="text-gray-500">Keine Nachrichten.</li>}
        {inbox.map((m) => (
          <li key={m.id} className="rounded border p-3">
            <div className="flex items-center justify-between gap-4">
              <p className={m.read_at ? "" : "font-bold"}>{m.subject}</p>
              {!m.read_at && (
                <button
                  onClick={() => markRead(m.id)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Als gelesen markieren
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Von {nameOf(m.sender_practice_id)} · {fmt(m.created_at)}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-semibold">Gesendet</h2>
      <ul className="flex flex-col gap-2">
        {sent.length === 0 && <li className="text-gray-500">Noch nichts gesendet.</li>}
        {sent.map((m) => (
          <li key={m.id} className="rounded border p-3">
            <p className="font-medium">{m.subject}</p>
            <p className="text-sm text-gray-600">
              An {nameOf(m.recipient_practice_id)} · {fmt(m.created_at)}
              {m.read_at ? " · gelesen" : " · ungelesen"}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}