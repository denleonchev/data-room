import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import { AppModule } from "./app.module";
import { auth } from "./auth/auth";

async function bootstrap() {
  // Better Auth reads the raw request body, so Nest's body parser is disabled at
  // creation and re-enabled below — after the auth handler is mounted.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  });

  app.use("/api/auth", toNodeHandler(auth));
  app.useBodyParser("json");

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

bootstrap();
