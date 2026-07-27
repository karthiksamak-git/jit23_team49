import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@careerverse/database";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "stub_client_id",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "stub_client_secret",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "stub_client_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "stub_client_secret",
    },
  },
});
