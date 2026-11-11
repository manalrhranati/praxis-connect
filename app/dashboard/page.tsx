"use client";

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
      <button onClick={logout} className="mt-4 rounded border px-3 py-1">
        Abmelden
      </button>
    </main>
  );
}