import type { LucideIcon } from 'lucide-react';

export type StatCardTone = 'navy' | 'indigo' | 'teal' | 'safe' | 'monitor' | 'action' | 'critical' | 'expired';

interface StatCardProps {
  label: string;
  value: string | number;
  context: string;
  icon: LucideIcon;
  tone?: StatCardTone;
}

export default function StatCard({ label, value, context, icon: Icon, tone = 'indigo' }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-icon"><Icon size={19} strokeWidth={2} aria-hidden="true" /></span>
      </div>
      <strong className="stat-card-value">{value}</strong>
      <p className="stat-card-context">{context}</p>
    </article>
  );
}
