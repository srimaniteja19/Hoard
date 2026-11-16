import { redirect } from "next/navigation";
import { AuthError, requireUserId } from "@/lib/session";
import { getStatsOverview } from "@/lib/stats/queries";
import { AppPage } from "@/components/chrome/AppPage";
import { StatsDashboard } from "@/components/stats/StatsDashboard";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }

  const initialData = await getStatsOverview(userId, "90d");

  return (
    <AppPage width="full">
      <StatsDashboard initialData={initialData} />
    </AppPage>
  );
}
