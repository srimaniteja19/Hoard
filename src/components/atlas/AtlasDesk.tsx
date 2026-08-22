"use client";

import { useRouter } from "next/navigation";
import { useAtlasList, type AtlasChips } from "@/hooks/useAtlas";
import type { AtlasCadence, AtlasDepth } from "@/lib/atlas/types";
import { AtlasCapture } from "@/components/atlas/AtlasCapture";
import { AtlasCover } from "@/components/atlas/AtlasCover";

export function AtlasDesk() {
  const router = useRouter();
  const { atlases, loading, archiveWell, create, archive, restore, drop, toggleArchive } = useAtlasList();

  const walking = atlases.filter((atlas) => atlas.status === "walking");
  const drafts = atlases.filter((atlas) => atlas.status === "draft");

  const handleCreate = async (prompt: string, chips?: AtlasChips) => {
    const atlas = await create(prompt, chips);
    if (atlas) router.push(`/atlas/${atlas.id}`);
    return atlas;
  };

  const handleFixture = async () => {
    const systems = (await import("@/lib/atlas/__fixtures__/systems.json")).default;
    const atlas = await create(
      systems.prompt,
      { depth: systems.depth as AtlasDepth, cadence: systems.cadence as AtlasCadence },
      systems.syllabus
    );
    if (atlas) router.push(`/atlas/${atlas.id}`);
  };

  return (
    <div className="atlas-desk">
      <AtlasCapture onCreate={handleCreate} />
      {process.env.NODE_ENV !== "production" ? (
        <button type="button" className="atlas-fixture" onClick={() => void handleFixture()}>
          File systems fixture
        </button>
      ) : null}

      {loading ? <p className="atlas-muted">Loading…</p> : null}

      {!loading && walking.length > 0 ? (
        <section className="atlas-list">
          <h2 className="atlas-list-kicker">Walking</h2>
          {walking.map((atlas) => (
            <AtlasCover key={atlas.id} atlas={atlas} onArchive={() => void archive(atlas.id)} />
          ))}
        </section>
      ) : null}

      {!loading && drafts.length > 0 ? (
        <section className="atlas-list">
          <h2 className="atlas-list-kicker">Drafts</h2>
          {drafts.map((atlas) => (
            <AtlasCover
              key={atlas.id}
              atlas={atlas}
              onArchive={() => void archive(atlas.id)}
              onDrop={() => void drop(atlas.id)}
            />
          ))}
        </section>
      ) : null}

      <section className="atlas-archive">
        <button type="button" onClick={toggleArchive}>
          {archiveWell.open ? "Hide archive" : "Archive"}
        </button>
        {archiveWell.open ? (
          <div className="atlas-archive-body">
            {archiveWell.loading ? (
              <p className="atlas-muted">Loading…</p>
            ) : archiveWell.items.length === 0 ? (
              <p className="atlas-muted">Empty.</p>
            ) : (
              archiveWell.items.map((atlas) => (
                <AtlasCover
                  key={atlas.id}
                  atlas={atlas}
                  onRestore={() => void restore(atlas.id)}
                  onDrop={() => void drop(atlas.id)}
                />
              ))
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
