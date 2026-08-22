import { AppPage } from "@/components/chrome/AppPage";
import { AskSavedList } from "@/components/library/AskSavedList";

export default function AskSavedPage() {
  return (
    <AppPage width="xl">
      <div className="ask-saved-room">
        <AskSavedList />
      </div>
    </AppPage>
  );
}
