import { redirect } from "next/navigation";
import { requireUserId, AuthError } from "@/lib/session";
import { AppPage } from "@/components/chrome/AppPage";
import { AtlasDesk } from "@/components/atlas/AtlasDesk";

export default async function AtlasPage() {
  try {
    await requireUserId();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  return (
    <AppPage width="md">
      <AtlasDesk />
    </AppPage>
  );
}
