interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-zinc-600 mb-4 text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-zinc-400 text-sm max-w-sm mb-4">{description}</p>}
      {actionLabel && actionHref && (
        <a href={actionHref} className="px-4 py-2 bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors text-sm">
          {actionLabel}
        </a>
      )}
      {actionLabel && onAction && !actionHref && (
        <button onClick={onAction} className="px-4 py-2 bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
