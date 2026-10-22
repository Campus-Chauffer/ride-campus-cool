// Shared stat tile used on Dashboard, Analytics and TodayStats. Deliberately
// plain — a label, a value, an optional caption — no icon-in-a-tinted-circle:
// that pattern reads as a generated-dashboard default rather than this
// product's own screen, and six different hues across one row of cards burns
// through the accent budget that should be reserved for actual data.
export default function KpiTile({ label, value, sub, live, nested }) {
  return (
    <div className={nested ? 'bg-gray-800/40 rounded-lg p-4' : 'bg-gray-900 rounded-xl border border-gray-800 p-5'}>
      <div className="flex items-center gap-2">
        <p className="text-gray-400 text-xs">{label}</p>
        {live && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
      </div>
      <p className="text-white text-2xl font-semibold tracking-tight mt-1.5">{value ?? '—'}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}
