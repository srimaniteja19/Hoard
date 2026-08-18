import { redirect } from "next/navigation";
import { requireUserId, AuthError } from "@/lib/session";
import { getHomeEdition } from "@/lib/home/edition";
import { HomeCommand } from "@/components/home/HomeCommand";

export default async function HomePage() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  const edition = await getHomeEdition(userId, { minutes: 180, context: "all" });
  return <HomeCommand edition={edition} />;
}
