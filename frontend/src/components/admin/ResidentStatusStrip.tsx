export type StatusLight = 'green' | 'yellow' | 'red';

export interface ResidentStatusIndicators {
  health: StatusLight;
  education: StatusLight;
  counseling: StatusLight;
  risk: StatusLight;
}

const DOT_CLASS: Record<StatusLight, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
};

/** Progress domains: green = doing well. Risk: green = low risk (good). */
function labelFor(domain: 'health' | 'education' | 'counseling' | 'risk', level: StatusLight): string {
  if (domain === 'risk') {
    return level === 'green' ? 'low (favorable)' : level === 'yellow' ? 'moderate' : 'high — needs attention';
  }
  return level === 'green' ? 'stable' : level === 'yellow' ? 'needs attention' : 'critical';
}

function ariaFor(domain: 'health' | 'education' | 'counseling' | 'risk', level: StatusLight, isRisk: boolean): string {
  const d =
    domain === 'health'
      ? 'Health'
      : domain === 'education'
        ? 'Education'
        : domain === 'counseling'
          ? 'Counseling'
          : 'Risk';
  if (isRisk) {
    return `${d}: ${level === 'green' ? 'low risk' : level === 'yellow' ? 'moderate risk' : 'high risk'}. Lower risk is better.`;
  }
  return `${d}: ${labelFor(domain, level)}`;
}

type StripVariant = 'compact' | 'labeled';

interface ResidentStatusStripProps {
  levels: ResidentStatusIndicators;
  variant?: StripVariant;
  className?: string;
}

const ORDER: Array<{ key: keyof ResidentStatusIndicators; letter: string; label: string }> = [
  { key: 'health', letter: 'H', label: 'Health' },
  { key: 'education', letter: 'E', label: 'Education' },
  { key: 'counseling', letter: 'C', label: 'Counseling' },
  { key: 'risk', letter: 'R', label: 'Risk' },
];

export default function ResidentStatusStrip({ levels, variant = 'compact', className = '' }: ResidentStatusStripProps) {
  return (
    <div
      className={`flex items-end gap-2 ${className}`}
      role="group"
      aria-label="Resident status: Health, Education, Counseling, Risk"
    >
      {ORDER.map(({ key, letter, label }) => {
        const level = levels[key];
        const isRisk = key === 'risk';
        const domain = key as 'health' | 'education' | 'counseling' | 'risk';
        const title =
          key === 'risk'
            ? `${label}: ${labelFor('risk', level)}. Lower risk is better.`
            : `${label}: ${labelFor(domain, level)}`;
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <span
              title={title}
              aria-label={ariaFor(domain, level, isRisk)}
              className={`block rounded-full shrink-0 ${variant === 'compact' ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${DOT_CLASS[level]}`}
            />
            {variant === 'labeled' && (
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight" aria-hidden>
                {letter}
              </span>
            )}
            {variant === 'labeled' && (
              <span className="text-[9px] text-slate-400 text-center max-w-[4.5rem] leading-tight hidden sm:block">{label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
