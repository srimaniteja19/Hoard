import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/components/chrome/AppPage";
import { ChromeSlot } from "@/components/chrome/slots";
import { AskLibraryChat } from "@/components/library/AskLibraryChat";

export default function LibraryAskPage() {
  return (
    <AppPage width="md">
      <ChromeSlot name="trailing">
        <Link href="/library" className="app-header-link">
          <ArrowLeft size={14} /> LIBRARY
        </Link>
      </ChromeSlot>

      <div className="ask-page-head">
        <h1>ASK YOUR LIBRARY</h1>
        <p>Synthesized from what you saved — not the open web.</p>
      </div>

      <AskLibraryChat />
    </AppPage>
  );
}
