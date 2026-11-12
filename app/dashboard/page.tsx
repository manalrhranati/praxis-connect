"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setEmail(data.user.email ?? null);
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!email) return null;

  return (
    <main className="mx-auto mt-24 max-w-xl p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2">Eingeloggt als {email}</p>
      <div className="mt-4 flex items-center gap-4">
  <Link href="/termine" className="text-blue-600 underline">
    Zu den Terminen
  </Link>
  <button onClick={logout} className="rounded border px-3 py-1">
    Abmelden
  </button>
</div>
    </main>
  );
}