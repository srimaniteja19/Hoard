export function AtlasPunchRow({ done, total }: { done: number; total: number }) {
  const shown = Math.min(Math.max(total, 0), 24);
  if (total === 0) {
    return (
      <span className="atlas-punch" aria-label="0 of 0 required">
        <span className="atlas-punch-empty">0 / 0</span>
      </span>
    );
  }

  return (
    <span className="atlas-punch" aria-label={`${done} of ${total} required`}>
      {Array.from({ length: shown }, (_, index) => (
        <span key={index} className={`atlas-punch-hole${index < done ? " is-in" : ""}`} />
      ))}
      {total > shown ? <span className="atlas-punch-more">+{total - shown}</span> : null}
    </span>
  );
}
