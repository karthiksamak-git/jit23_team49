import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { config } from "dotenv";
import { resolve } from "node:path";
import { AppModule } from "./app.module";

// Load the monorepo root .env so `npm run dev` works from any entrypoint
// (turbo strict env mode does not forward vars to child tasks on all setups).
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(process.cwd(), ".env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  app.setGlobalPrefix("api");

  const port = process.env.PORT || 4000;
  if (!port || port === "0") {
    console.warn(`[api] Suspicious PORT=${port} in environment — falling back to 4000`);
  }
  await app.listen(port === "0" ? 4000 : port);
  console.log(`CareerVerse API running on http://localhost:${port}`);
}

bootstrap();
