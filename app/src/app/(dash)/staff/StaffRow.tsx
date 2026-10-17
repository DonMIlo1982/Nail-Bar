"use client";
import { useActionState, useState } from "react";
import { PERMS, ROLE_LABEL, ROLE_PERMS, type Role, type Staff } from "@/lib/perms";
import { updateStaff } from "./actions";

export function StaffRow({ s, isMe }: { s: Staff; isMe: boolean }) {
  const [msg, action, pending] = useActionState(updateStaff, null);
  const [role, setRole] = useState<Role>(s.role);
  const [perms, setPerms] = useState<string[]>(s.active || s.perms.length ? s.perms : ROLE_PERMS[s.role]);
  const pick = (r: Role) => { setRole(r); setPerms(ROLE_PERMS[r]); };

  return (
    <form action={action} className="panel" style={{ marginBottom: 12 }}>
      <input type="hidden" name="id" value={s.id} />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <b>{s.name}</b> {isMe && <span className="badge ok">You</span>}{" "}
          {!s.active && <span className="badge">Waiting to be switched on</span>}
          <div className="muted small">{s.email}</div>
        </div>
      </div>
      <div className="grid2" style={{ marginTop: 12 }}>
        <label className="fld">Name<input name="name" defaultValue={s.name} /></label>
        <label className="fld">Role
          <select name="role" value={role} onChange={(e) => pick(e.target.value as Role)} disabled={isMe}>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          {isMe && <input type="hidden" name="role" value={role} />}
        </label>
      </div>
      <div className="fld" style={{ marginBottom: 6 }}>Allowed to (everyone can use the dashboard home)</div>
      <div style={{ display: "grid", gap: 2, marginBottom: 10 }}>
        {PERMS.map(([k, label]) => (
          <label key={k} className="check" style={{ margin: 0 }}>
            <input type="checkbox" name={"perm_" + k} checked={role === "owner" || perms.includes(k)} disabled={role === "owner"}
              onChange={(e) => setPerms((p) => (e.target.checked ? [...p, k] : p.filter((x) => x !== k)))} />
            {label}
          </label>
        ))}
      </div>
      <label className="check">
        <input type="checkbox" name="active" defaultChecked={s.active} disabled={isMe} />
        Login is switched on
        {isMe && <input type="hidden" name="active" value="on" />}
      </label>
      {msg && msg !== "saved" && <p className="err">{msg}</p>}
      <div className="row">
        <button className="primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        {msg === "saved" && <span className="small" style={{ color: "var(--ok)" }}>Saved</span>}
      </div>
    </form>
  );
}
