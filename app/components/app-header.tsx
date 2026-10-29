"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";

const navigation = [
  { href: "/", label: "New analysis" },
  { href: "/workspace", label: "Workspace" },
  { href: "/evaluation", label: "Evaluation" }
];

export function AppHeader() {
  const pathname = usePathname();
  return <header className="app-header"><div className="header-inner">
    <Link className="brand-link" href="/" aria-label="Open Resume Lab home"><Brand /></Link>
    <nav className="app-nav" aria-label="Main navigation">{navigation.map(item => {
      const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      return <Link href={item.href} key={item.href} aria-current={active ? "page" : undefined}>{item.label}</Link>;
    })}</nav>
    <div className="header-tools"><a href="https://github.com/laizhen1/ai-resume-screener" target="_blank" rel="noopener noreferrer" className="source-link">Open source <span aria-hidden="true">↗</span></a><Link className="sign-in-link" href="/login">Sign in</Link></div>
  </div></header>;
}

export function AppFooter() {
  return <footer className="app-footer"><span>Thoughtful analysis. Human decisions.</span><span>Open Resume Lab <span aria-hidden="true">·</span> Local inference supported</span></footer>;
}
