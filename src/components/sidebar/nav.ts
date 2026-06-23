import {
  CalendarDays,
  CreditCard,
  FileText,
  Gift,
  KeyRound,
  ListChecks,
  Package,
} from "lucide-react";

export const navItems = [
  { href: "/daily-tracker", label: "Daily tracker", icon: ListChecks },
  { href: "/money", label: "Money management", icon: CreditCard },
  { href: "/items", label: "Things bought / expiry", icon: Package },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reminders", label: "Reminders", icon: CalendarDays },
  { href: "/birthdays", label: "Birthdays", icon: Gift },
  { href: "/vault", label: "Keys / passwords", icon: KeyRound },
] as const;

