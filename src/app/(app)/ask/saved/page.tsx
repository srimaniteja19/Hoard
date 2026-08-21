import Link from "next/link";
import { AppPage } from "@/components/chrome/AppPage";
import { AskSavedList } from "@/components/library/AskSavedList";

export default function AskSavedPage() {
  return (
    <AppPage width="lg">
      <div className="ask-page-head">
        <p className="ask-page-kicker">SAVED</p>
        <p>Answers you kept from the desk, with the question and the shelf as they were.</p>
        <p>
          <Link href="/ask">← ASK</Link>
        </p>
      </div>
      <AskSavedList />
    </AppPage>
  );
}
