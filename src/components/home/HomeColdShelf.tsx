import Link from "next/link";
import type { DeskColdItem } from "@/lib/home/deskModel";

export function HomeColdShelf({
  count,
  items,
}: {
  count: number;
  items: DeskColdItem[];
}) {
  return (
    <section className="home-cold" aria-label="The cold shelf">
      <div className="home-cold-head">
        <h2 className="home-display">THE COLD SHELF</h2>
        <span className="home-cold-count">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="home-empty-line">Everything has been opened once.</p>
      ) : (
        <ul className="home-cold-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="home-cold-row">
                <span className="home-cold-month">{item.month}</span>
                <span className="home-cold-title">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="home-cold-foot">
        SAVED AND NEVER ONCE OPENED. NOT A BACKLOG — JUST THE HONEST COUNT.
      </p>
    </section>
  );
}
