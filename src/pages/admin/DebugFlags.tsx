import { ALL_FEATURE_KEYS } from "@/lib/featureKeys";
import { useFeatureFlagsContext } from "@/providers/FeatureFlagsProvider";

export default function DebugFlags() {
  const { flags, loading } = useFeatureFlagsContext();

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Feature Flags (Debug)</h1>
        <p className="text-sm text-muted-foreground">
          Resolved values for the current user. Read-only.
        </p>
      </header>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2">Feature key</th>
              <th className="text-left px-4 py-2">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {ALL_FEATURE_KEYS.map((key) => {
              const value = flags[key];
              return (
                <tr key={key} className="border-t">
                  <td className="px-4 py-2 font-mono">{key}</td>
                  <td className="px-4 py-2">
                    {loading
                      ? "…"
                      : value === true
                      ? "✅ true"
                      : value === false
                      ? "❌ false"
                      : "— unresolved"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}