import { redirect } from "next/navigation";

export default function BackendWorldPage() {
  redirect("/worlds/dojo?missionId=m1&title=The%20Foundation%20Shrine&domain=Backend%20Development&lore=Learn%20the%20fundamentals%20of%20how%20servers%20receive%20and%20respond%20to%20HTTP%20requests.");
}
