export function AppLoading({ label = "LOADING HOARD..." }: { label?: string }) {
  return (
    <div className="app-loading" role="status">
      {label}
    </div>
  );
}
