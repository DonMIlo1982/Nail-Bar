"use client";
import { useActionState } from "react";
import { signIn } from "./actions";

export default function Login() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <main className="login">
      <form action={action} className="panel">
        <span className="brand">
          Spoilt Brat<small>Staff login</small>
        </span>
        {error && <p className="err" role="alert">{error}</p>}
        <label className="fld">
          Email
          <input name="email" type="email" autoComplete="username" required autoFocus />
        </label>
        <label className="fld">
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="primary" style={{ width: "100%", justifyContent: "center" }} disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </button>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Forgot your password? Ask the owner to reset it.
        </p>
      </form>
    </main>
  );
}
