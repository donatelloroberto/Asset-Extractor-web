import serverless from 'serverless-http';
import { buildApp } from '../../server/app.js';

process.env.SERVERLESS = "1";

let handlerPromise: Promise<any> | null = null;

async function createHandler() {
  const app = await buildApp();
  return serverless(app);
}

export const handler: any = async (event: any, context: any) => {
  if (!handlerPromise) handlerPromise = createHandler();
  const fn = await handlerPromise;
  return fn(event, context);
};
