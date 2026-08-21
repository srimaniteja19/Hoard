import Link from "next/link";
import { AppPage } from "@/components/chrome/AppPage";
import { AskSavedList } from "@/components/library/AskSavedList";

export default function AskSavedPage() {
  return (
    <AppPage width="xl">
      <div className="ask-saved-room">
        <div className="ask-saved-masthead">
          <p className="ask-page-kicker">THE MARGIN</p>
          <h1 className="ask-saved-title">
            <span className="ask-hero-stamp ask-hero-stamp-sm">KEPT</span>
            <span className="ask-saved-title-rest">from the desk</span>
          </h1>
          <p className="ask-saved-dek">
            Answers you stamped and filed — question, write-up, and the shelf as it was that day.
          </p>
          <p>
            <Link href="/ask" prefetch={false} className="ask-back">
              ← THE DESK
            </Link>
          </p>
        </div>
        <AskSavedList />
      </div>
    </AppPage>
  );
}
