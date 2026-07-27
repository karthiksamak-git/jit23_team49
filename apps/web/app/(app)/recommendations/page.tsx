"use client";

import { redirect } from "next/navigation";

// Recommendations are integrated into the World Map
export default function RecommendationsPage() {
  redirect("/world-map");
}
