function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.trim().length < 2) return <>{text}</>;
  const pattern = escapeRegex(query.trim());
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-transparent text-brand-gold font-semibold">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
