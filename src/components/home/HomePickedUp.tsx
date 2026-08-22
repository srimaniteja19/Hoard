import Link from "next/link";
import type { DeskResumeItem } from "@/lib/home/deskModel";

export function HomePickedUp({ items }: { items: DeskResumeItem[] }) {
  return (
    <section className="home-picked" aria-label="Picked up, not put down">
      <h2 className="home-display">PICKED UP, NOT PUT DOWN</h2>
      {items.length === 0 ? (
        <p className="home-empty-line">Nothing mid-read. Open something and leave a mark.</p>
      ) : (
        <ul className="home-picked-list">
          {items.map((item) => (
            <li key={item.id} className="home-picked-row">
              <div className="home-picked-copy">
                <div className="home-picked-title">{item.title}</div>
                <div className="home-picked-crumb">{item.crumb}</div>
              </div>
              <Link href={item.href} className="home-picked-resume">
                RESUME ↵
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
