import type { HomeDesk } from "@/lib/home/deskModel";

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function HomeCounters({ counters }: { counters: HomeDesk["counters"] }) {
  return (
    <section className="home-counters" aria-label="Library counters">
      <article className="home-counter home-counter-cyan">
        <div className="home-kicker">IN THE LIBRARY</div>
        <div className="home-counter-num">{formatCount(counters.inLibrary)}</div>
        <div className="home-counter-sub">
          {counters.addedThisWeek > 0 ? `+${counters.addedThisWeek} THIS WEEK` : "THIS WEEK QUIET"}
        </div>
      </article>
      <article className="home-counter home-counter-lime">
        <div className="home-kicker">REACHED FOR</div>
        <div className="home-counter-num">{formatCount(counters.reachedFor)}</div>
        <div className="home-counter-sub">
          ALL TIME · {counters.reachedThisWeek} THIS WEEK
        </div>
      </article>
      <article className="home-counter home-counter-violet">
        <div className="home-kicker">NEVER OPENED</div>
        <div className="home-counter-num">{formatCount(counters.neverOpened)}</div>
        <div className="home-counter-sub">{counters.neverOpenedPct}% OF THE LIBRARY</div>
      </article>
      <article className="home-counter home-counter-streak">
        <div className="home-kicker">TIL STREAK</div>
        <div className="home-counter-num">{formatCount(counters.tilStreak)}</div>
        <div className="home-counter-sub">DAYS RUNNING</div>
        <div
          className="home-streak-grid"
          aria-label={`Activity over the last 14 days: ${counters.last14.join(", ")}`}
        >
          {counters.last14.map((count, index) => (
            <span key={index} data-on={count > 0} />
          ))}
        </div>
      </article>
    </section>
  );
}
