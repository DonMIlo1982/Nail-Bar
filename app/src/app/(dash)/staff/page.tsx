import { requirePerm, type Staff } from "@/lib/auth";
import { StaffRow } from "./StaffRow";

export default async function StaffPage() {
  const { supabase, staff: me } = await requirePerm("settings");
  const { data } = await supabase.from("staff").select("*").order("active").order("name");
  const list = (data || []) as Staff[];
  const waiting = list.filter((s) => !s.active);
  return (
    <main className="page narrow">
      <div className="head"><h1>Staff logins</h1></div>
      <div className="panel small" style={{ marginBottom: 16 }}>
        <b>To add someone:</b>
        <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li>In Supabase, open <b>Authentication → Users → Add user → Create new user</b>.</li>
          <li>Enter their email and a starting password, tick <b>Auto Confirm User</b>, and create.</li>
          <li>Come back here, refresh, set their role, tick <b>Login is switched on</b> and save.</li>
          <li>Give them the web address, their email and the starting password.</li>
        </ol>
      </div>
      {waiting.length > 0 && <p className="notice">{waiting.length} login{waiting.length === 1 ? " is" : "s are"} waiting to be switched on.</p>}
      {list.map((s) => <StaffRow key={s.id} s={s} isMe={s.id === me.id} />)}
    </main>
  );
}
