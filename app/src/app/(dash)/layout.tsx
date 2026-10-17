import Link from "next/link";
import { can, getSession, ROLE_LABEL } from "@/lib/auth";
import { signOut } from "../login/actions";
import { Nav } from "./Nav";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const { staff, user } = await getSession();

  // Logged in, but the owner hasn't switched this login on yet.
  if (!staff?.active) {
    return (
      <main className="login">
        <div className="panel">
          <span className="brand">Spoilt Brat<small>Staff login</small></span>
          <p>
            You&apos;re logged in as <b>{user.email}</b>, but your login hasn&apos;t been switched on yet.
          </p>
          <p className="muted small">Ask the owner to open Staff and switch your login on, then log in again.</p>
          <form action={signOut}><button>Log out</button></form>
        </div>
      </main>
    );
  }

  const links = [
    { href: "/", label: "Dashboard" },
    ...(can(staff, "clients") ? [{ href: "/clients", label: "Clients" }] : []),
    ...(can(staff, "stock") ? [{ href: "/stock", label: "Stock & services" }] : []),
    ...(can(staff, "settings") ? [{ href: "/settings", label: "Settings" }, { href: "/staff", label: "Staff" }] : []),
  ];

  return (
    <>
      <header className="top">
        <Link href="/" className="brand">Spoilt Brat<small>Staff dashboard</small></Link>
        <Nav links={links} />
        <div className="who">
          <span><b>{staff.name}</b> <span className="muted">· {ROLE_LABEL[staff.role]}</span></span>
          <form action={signOut}><button className="ghost">Log out</button></form>
        </div>
      </header>
      {children}
    </>
  );
}
