import type {FastifyInstance} from "fastify";
import {defineSecret} from "firebase-functions/params";
import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
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

export const api = onRequest(
  {secrets: [databaseUrl, jwtSecret, webOrigin]},
  async (request, response) => {
    const app = await getApp();
    app.routing(request, response);
  }
);
