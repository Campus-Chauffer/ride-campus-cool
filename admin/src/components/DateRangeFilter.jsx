export const PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "all", label: "All Time" },
];

// Computes a { from, to } ISO-timestamp range (to is exclusive) for a given
// period id, anchored to the admin's local browser time. Returns null for
// "all" since that means "don't filter" to the caller.
export function getPeriodRange(period) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  let from;
  if (period === "today") {
    from = startOfDay;
  } else if (period === "week") {
    // Week starts Monday
    const day = startOfDay.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    from = new Date(startOfDay);
    from.setDate(from.getDate() - diffToMonday);
  } else if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    return null;
  }

  return { from: from.toISOString(), to: endOfDay.toISOString() };
}

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 flex-wrap">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
            value === p.id
              ? "bg-yellow-400 text-gray-900"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
