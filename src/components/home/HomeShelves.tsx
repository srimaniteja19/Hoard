import Link from "next/link";
import { shelfDisplayName, spineSize, type DeskShelf } from "@/lib/home/deskModel";

export function HomeShelves({ shelves }: { shelves: DeskShelf[] }) {
  const max = Math.max(0, ...shelves.map((shelf) => shelf.count));

  return (
    <section className="home-shelves" aria-label="The shelves">
      <div className="home-shelves-head">
        <h2 className="home-display">THE SHELVES</h2>
        <p className="home-shelves-hint">width = how full · hover to pull one out</p>
      </div>
      <div className="home-shelf-rail">
        {shelves.length === 0 ? (
          <p className="home-empty-line">No jackets on the shelf yet.</p>
        ) : (
          shelves.map((shelf) => {
            const size = spineSize(shelf.count, max);
            return (
              <Link
                key={shelf.id}
                href="/library"
                className={`home-spine${shelf.unfiled ? " home-spine-unfiled" : ""}`}
                style={{
                  width: size.width,
                  height: size.height,
                  background: shelf.unfiled ? undefined : shelf.color,
                }}
                aria-label={`${shelfDisplayName(shelf.name, shelf.unfiled)} ${shelf.count}`}
              >
                <span className="home-spine-label">
                  {shelfDisplayName(shelf.name, shelf.unfiled)} {shelf.count}
                </span>
              </Link>
            );
          })
        )}
        <span className="home-shelf-plank" aria-hidden="true" />
      </div>
    </section>
  );
}
