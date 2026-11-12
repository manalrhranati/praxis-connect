"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
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

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const primary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700";

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
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl p-4">
        <h1 className="mt-6 text-2xl font-bold">Nachrichten</h1>
        <p className="mt-1 text-slate-600">Sicherer Austausch zwischen Praxen (nur Testdaten).</p>

        <form
          onSubmit={send}
          className="mt-6 flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold">Neue Nachricht</h2>
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className={input}
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
            className={input}
            required
          />
          <textarea
            placeholder="Nachricht (nur Testdaten, keine echten Patientendaten)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${input} min-h-24`}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className={primary}>Senden</button>
        </form>

        <div className="mt-8 grid gap-8 pb-8 md:grid-cols-2">
          <section>
            <h2 className="mb-3 font-semibold">
              Posteingang{" "}
              <span className="text-sm font-normal text-slate-500">
                ({inbox.filter((m) => !m.read_at).length} ungelesen)
              </span>
            </h2>
            <ul className="flex flex-col gap-3">
              {inbox.length === 0 && (
                <li className="rounded-xl border border-dashed bg-white p-6 text-center text-slate-500">
                  Keine Nachrichten.
                </li>
              )}
              {inbox.map((m) => (
                <li key={m.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className={m.read_at ? "font-medium" : "font-bold"}>
                      {!m.read_at && (
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-600" />
                      )}
                      {m.subject}
                    </p>
                    {!m.read_at && (
                      <button
                        onClick={() => markRead(m.id)}
                        className="shrink-0 rounded-lg border px-2.5 py-1 text-xs hover:bg-slate-50"
                      >
                        Gelesen
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Von {nameOf(m.sender_practice_id)} · {fmt(m.created_at)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Gesendet</h2>
            <ul className="flex flex-col gap-3">
              {sent.length === 0 && (
                <li className="rounded-xl border border-dashed bg-white p-6 text-center text-slate-500">
                  Noch nichts gesendet.
                </li>
              )}
              {sent.map((m) => (
                <li key={m.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{m.subject}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.read_at ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {m.read_at ? "gelesen" : "ungelesen"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    An {nameOf(m.recipient_practice_id)} · {fmt(m.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}