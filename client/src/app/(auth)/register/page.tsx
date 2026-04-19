"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { ApiError } from "@/lib/errors";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await register(name, email, password);
      router.push("/");
    } catch (ex) {
      const msg =
        ex instanceof ApiError
          ? ex.message
          : ex instanceof Error
            ? ex.message
            : "Registration failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Create account</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-zinc-900 px-3 py-2 ring-1 ring-zinc-700 focus:ring-netflix"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded bg-zinc-900 px-3 py-2 ring-1 ring-zinc-700 focus:ring-netflix"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Password (min 6)</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded bg-zinc-900 px-3 py-2 ring-1 ring-zinc-700 focus:ring-netflix"
          />
        </div>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-netflix py-2.5 font-semibold text-white hover:bg-netflix-dark disabled:opacity-50"
        >
          {loading ? "Creating..." : "Join Streamflix"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="text-white hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
