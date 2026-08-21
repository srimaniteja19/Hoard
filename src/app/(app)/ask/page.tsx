import { AppPage } from "@/components/chrome/AppPage";
import { AskLibraryChat } from "@/components/library/AskLibraryChat";

export default function AskPage() {
  return (
    <AppPage width="lg">
      <div className="ask-page-head">
        <p className="ask-page-kicker">THE DESK</p>
        <p>Saved notes first. A real answer even when the card is just a title.</p>
      </div>

      <AskLibraryChat />
    </AppPage>
  );
}
