import type {FastifyInstance} from "fastify";
import type {Request} from "firebase-functions/v2/https";
import type {Response as ExpressResponse} from "express";
import {defineSecret} from "firebase-functions/params";
import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
import type {InjectOptions} from "light-my-request";
import type {OutgoingHttpHeaders} from "node:http";
import {buildApp} from "../../apps/api/src/app.ts";

setGlobalOptions({maxInstances: 10, region: "us-central1"});

const databaseUrl = defineSecret("DATABASE_URL");
const jwtSecret = defineSecret("JWT_SECRET");
const webOrigin = defineSecret("WEB_ORIGIN");

let appPromise: Promise<FastifyInstance> | undefined;

function configureRuntimeEnv(): void {
  process.env.DATABASE_URL = databaseUrl.value();
  process.env.JWT_SECRET = jwtSecret.value();
  process.env.WEB_ORIGIN = webOrigin.value();
  process.env.NODE_ENV = "production";
}

async function getApp(): Promise<FastifyInstance> {
  configureRuntimeEnv();

  appPromise ??= buildApp().then(async (app) => {
    await app.ready();
    return app;
  });

  return appPromise;
}

function setResponseHeaders(
  response: ExpressResponse<unknown>,
  headers: OutgoingHttpHeaders,
): void {
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      response.setHeader(name, value);
    }
  }
}

async function handleRequest(request: Request, response: ExpressResponse<unknown>): Promise<void> {
  const app = await getApp();
  const injectOptions: InjectOptions = {
    method: request.method as InjectOptions["method"],
    url: request.url,
    headers: request.headers,
    payload: request.rawBody,
  };
  const result = await app.inject(injectOptions);

  setResponseHeaders(response, result.headers);
  response.status(result.statusCode).send(result.body);
}

export const api = onRequest(
  {secrets: [databaseUrl, jwtSecret, webOrigin]},
  handleRequest,
);
