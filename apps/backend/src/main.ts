import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const logger = new Logger("Bootstrap");
  const port = Number(process.env.PORT ?? 3001);
  logger.log(`Attempting to listen on port ${port}`);
  const keepAlive = setInterval(() => undefined, 1_000);
  await app.listen(port);
  clearInterval(keepAlive);
  logger.log(`Backend listening on port ${port}`);

  return app;
}

void (async () => {
  await bootstrap();
})().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
