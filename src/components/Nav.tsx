import Link from "next/link";

const navItems = [
  { href: "/", label: "Discover" },
  { href: "/venues", label: "Venues" },
  { href: "/comedians", label: "Comedians" },
  { href: "/schedule", label: "Schedule" },
  { href: "/map", label: "Map" },
];

export function Nav() {
  return (
    <nav className="border-b border-zinc-800 bg-brand-dark/95 backdrop-blur supports-[backdrop-filter]:bg-brand-dark/80 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-brand-gold hover:text-brand-gold/90 transition-colors"
          >
            Punchline Atlas
          </Link>
          <ul className="flex gap-1 sm:gap-2">
            {navItems.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block px-3 py-2 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-sm font-medium transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
