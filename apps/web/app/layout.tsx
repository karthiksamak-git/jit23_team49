import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CareerVerse — Master Your Skill, Forge Your Career",
  description: "An immersive platform for career exploration. Create your Ronin, conquer the World Map, and master the ancient arts of technology.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#050608] text-[#e8e4d9] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
