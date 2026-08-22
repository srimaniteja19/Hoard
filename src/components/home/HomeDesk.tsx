import type { HomeDesk as HomeDeskData } from "@/lib/home/deskModel";
import { HomeBar } from "@/components/home/HomeBar";
import { HomeShelves } from "@/components/home/HomeShelves";
import { HomePickedUp } from "@/components/home/HomePickedUp";
import { HomeReached } from "@/components/home/HomeReached";
import { HomeVerso } from "@/components/home/HomeVerso";
import { HomeTilRecent } from "@/components/home/HomeTilRecent";
import { HomeColdShelf } from "@/components/home/HomeColdShelf";
import { HomeCounters } from "@/components/home/HomeCounters";

export function HomeDesk({ desk }: { desk: HomeDeskData }) {
  return (
    <div className="home-desk">
      <header className="home-folio-bar">
        <span className="home-folio-date">{desk.folio.dateLabel}</span>
        <span className="home-folio-badge">{desk.folio.savedTotal} IN THE LIBRARY</span>
        <span>{desk.folio.shelfCount} SHELVES</span>
        <span>{desk.folio.neverOpened} NEVER OPENED</span>
        <span className="home-folio-keys">⌘K FIND · 1–3 VERSO · ↵ RESUME</span>
      </header>

      <HomeBar />
      <HomeShelves shelves={desk.shelves} />

      <div className="home-desk-grid">
        <div className="home-desk-main">
          <HomePickedUp items={desk.pickedUp} />
          <HomeReached items={desk.mostReached} />
        </div>
        <aside className="home-desk-rail">
          <HomeVerso recall={desk.recall} />
          <HomeTilRecent items={desk.tilRecent} />
          <HomeColdShelf count={desk.coldShelf.count} items={desk.coldShelf.items} />
        </aside>
      </div>

      <HomeCounters counters={desk.counters} />
    </div>
  );
}
