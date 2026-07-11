"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  Globe,
  LayoutDashboard,
  Store,
} from "lucide-react";

const items = [
  { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/venues", label: "Venue & Court", icon: Store },
  { href: "/owner/bookings", label: "Booking", icon: CalendarDays },
  { href: "/owner/subscription", label: "Langganan", icon: CreditCard },
  { href: "/venues", label: "Lihat Publik", icon: Globe },
];

export function OwnerNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${pathname === item.href ? "active" : ""}`}
        >
          <item.icon className="h-4 w-4" /> {item.label}
        </Link>
      ))}
    </nav>
  );
}
