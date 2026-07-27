"use client";

import { redirect } from "next/navigation";

// The World Map IS the dashboard.
export default function DashboardPage() {
  redirect("/world-map");
}
