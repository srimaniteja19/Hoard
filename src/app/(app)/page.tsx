import { redirect } from "next/navigation";
import { requireUserId, AuthError } from "@/lib/session";
import { getHomeDesk } from "@/lib/home/deskQueries";
import { getOmniWeeklyGazette } from "@/lib/gazette/omniGazette";
import { HomeDesk } from "@/components/home/HomeDesk";
import { AppPage } from "@/components/chrome/AppPage";

export default async function HomePage() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }

  const [desk, gazette] = await Promise.all([
    getHomeDesk(userId),
    getOmniWeeklyGazette(userId),
  ]);

  return (
    <AppPage width="full">
      <HomeDesk desk={desk} gazette={gazette} />
    </AppPage>
  );
}
