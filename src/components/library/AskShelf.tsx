import Link from "next/link";
import type { AskSaveCitation } from "@/lib/library/askSave";

const KIND_TOKENS = new Set(["ART", "VID", "PLY", "GIT", "APP", "PPR", "DOC"]);

export function kindToken(cite: { ownerType: string; kind: string }): string {
  if (cite.ownerType === "til") return "TIL";
  const kind = cite.kind.trim().toUpperCase();
  if (KIND_TOKENS.has(kind)) return kind;
  if (kind) return kind.slice(0, 3);
  return "BM";
}

export function AskShelf({
  citations,
  activeCite,
  onActiveCite,
  onOpen,
}: {
  citations: AskSaveCitation[];
  activeCite?: number | null;
  onActiveCite?: (index: number | null) => void;
  onOpen?: (cite: AskSaveCitation) => void;
}) {
  if (citations.length === 0) return null;

  return (
    <div className="ask-shelf">
      <div className="ask-shelf-rail">
        <span className="ask-shelf-kicker">FROM THE SHELF</span>
        <span className="ask-shelf-count">{String(citations.length).padStart(2, "0")}</span>
      </div>
      <ul className="ask-cites">
        {citations.map((cite, index) => {
          const isTil = cite.ownerType === "til";
          const kind = kindToken(cite);
          return (
            <li key={`${cite.ownerType}:${cite.ownerId}`}>
              <Link
                href={cite.href}
                prefetch={false}
                target={isTil ? undefined : "_blank"}
                data-kind={kind}
                className={activeCite === index ? "is-hot" : undefined}
                onMouseEnter={() => onActiveCite?.(index)}
                onMouseLeave={() => onActiveCite?.(null)}
                onClick={() => onOpen?.(cite)}
              >
                <span className="ask-cite-num">{String(index + 1).padStart(2, "0")}</span>
                <span className="ask-cite-kind">{isTil ? "TIL" : cite.kind || "BM"}</span>
                <span className="ask-cite-title">{cite.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
