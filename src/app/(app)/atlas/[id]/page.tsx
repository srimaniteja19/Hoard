import { redirect } from "next/navigation";
import { requireUserId, AuthError } from "@/lib/session";
import { AppPage } from "@/components/chrome/AppPage";
import { AtlasDrawer } from "@/components/atlas/AtlasDrawer";

export default async function AtlasDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserId();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  const { id } = await params;
  return (
    <AppPage width="md">
      <AtlasDrawer id={id} />
    </AppPage>
  );
}
