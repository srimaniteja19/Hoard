import { AppPage } from "@/components/chrome/AppPage";
import { AskLibraryChat } from "@/components/library/AskLibraryChat";

export default function AskPage() {
  return (
    <AppPage variant="flush">
      <div className="ask-room">
        <AskLibraryChat />
      </div>
    </AppPage>
  );
}
