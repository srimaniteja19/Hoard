import { redirect } from "next/navigation";
import { AppPage } from "@/components/chrome/AppPage";
import { StudioApp } from "@/components/studio/StudioApp";
import { AuthError, requireUserId } from "@/lib/session";

export default async function StudioPage() {
  try {
    await requireUserId();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  return (
    <AppPage width="md">
      <StudioApp />
    </AppPage>
  );
}
