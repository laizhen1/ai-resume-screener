"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    router.push("/workspace");
  }
  return <main className="login-shell"><form className="login-card" onSubmit={submit}><Link className="brand-link" href="/">Open Resume Lab</Link><p className="eyebrow">SECURE WORKSPACE</p><h1>Sign in.</h1><p>Authentication is optional in local demo mode and should be enabled for shared deployments.</p><label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="primary">Sign in<span>→</span></button>{error && <div className="error">{error}</div>}</form></main>;
}
