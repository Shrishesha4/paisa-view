
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, LayoutDashboard, History } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="container mx-auto flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden md:block text-lg font-semibold">Paisa View</span>
        </Link>
        <div className="flex items-center justify-around w-full md:w-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col md:flex-row items-center gap-1 md:gap-2 p-2 rounded-lg transition-colors w-24 md:w-auto",
                pathname === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
                "md:text-sm md:font-medium md:hover:text-primary",
                pathname === item.href ? "md:text-primary" : "md:text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs md:text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
