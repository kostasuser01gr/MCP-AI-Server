export const config = {
  api: {
    bodyParser: false,
  },
};

let appPromise: Promise<((req: any, res: any) => void)> | null = null;

async function loadApp() {
  if (!appPromise) {
    appPromise = import('../server/src/app.js').then((m) => m.getApp());
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  const app = await loadApp();
  return app(req, res);
}
