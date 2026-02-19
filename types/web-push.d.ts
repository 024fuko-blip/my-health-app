declare module 'web-push' {
  interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  function sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string | Buffer | null,
    options?: { TTL?: number }
  ): Promise<{ statusCode: number }>;

  function generateVAPIDKeys(): VapidKeys;
}
