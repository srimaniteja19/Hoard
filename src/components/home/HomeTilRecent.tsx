import Link from "next/link";
import type { DeskTilItem } from "@/lib/home/deskModel";

export function HomeTilRecent({ items }: { items: DeskTilItem[] }) {
  return (
    <section className="home-til" aria-label="Today I learned">
      <div className="home-til-head">
        <h2 className="home-display">TODAY I LEARNED</h2>
        <Link href="/til" className="home-section-link">
          ALL →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="home-empty-line">Nothing filed yet.</p>
      ) : (
        <ul className="home-til-list">
          {items.map((item) => (
            <li key={item.id}>
              <p>{item.body}</p>
              <span className="home-til-when">{item.when}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
