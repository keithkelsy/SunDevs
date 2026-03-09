// Lambda entry point — adapts NestJS to AWS Lambda using serverless-express
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as express from 'express';
import type { Callback, Context, Handler } from 'aws-lambda';

let cachedServer: Handler;

async function bootstrapLambda(): Promise<Handler> {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableCors();
  await app.init();

  // Dynamic import to avoid bundling issues with serverless-express
  const { configure } = await import('@codegenie/serverless-express');
  return configure({ app: expressApp });
}

// Handler reuses the NestJS instance across warm Lambda invocations
export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
) => {
  if (!cachedServer) {
    cachedServer = await bootstrapLambda();
  }
  return cachedServer(event, context, callback);
};
