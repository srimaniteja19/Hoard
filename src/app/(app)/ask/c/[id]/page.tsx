import { AppPage } from "@/components/chrome/AppPage";
import { AskDesk } from "@/components/library/AskDesk";

export default async function AskThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppPage variant="flush">
      <AskDesk initialThreadId={id} />
    </AppPage>
  );
}
