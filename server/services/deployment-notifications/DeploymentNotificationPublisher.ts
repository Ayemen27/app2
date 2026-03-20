import type { NotificationProvider, DeploymentNotificationPayload, NotificationSendResult } from "./types.js";

export class DeploymentNotificationPublisher {
  private static instance: DeploymentNotificationPublisher;
  private providers: NotificationProvider[] = [];

  static getInstance(): DeploymentNotificationPublisher {
    if (!this.instance) this.instance = new DeploymentNotificationPublisher();
    return this.instance;
  }

  registerProvider(provider: NotificationProvider): void {
    if (!provider.isEnabled()) {
      console.warn(`[NotificationPublisher] channel ${provider.channel} disabled — not registered`);
      return;
    }
    if (this.providers.some(p => p.channel === provider.channel)) {
      return;
    }
    this.providers.push(provider);
    console.log(`[NotificationPublisher] registered channel: ${provider.channel}`);
  }

  async publish(payload: DeploymentNotificationPayload): Promise<NotificationSendResult[]> {
    if (this.providers.length === 0) return [];

    const results = await Promise.allSettled(
      this.providers.map(async (provider) => {
        const start = Date.now();
        try {
          const result = await provider.send(payload);
          return {
            channel: provider.channel,
            ok: result.ok,
            messageId: result.messageId,
            error: result.error,
            durationMs: Date.now() - start,
          } as NotificationSendResult;
        } catch (err: any) {
          return {
            channel: provider.channel,
            ok: false,
            error: err.message,
            durationMs: Date.now() - start,
          } as NotificationSendResult;
        }
      })
    );

    const finalResults: NotificationSendResult[] = results.map(r =>
      r.status === "fulfilled" ? r.value : { channel: "unknown", ok: false, error: String(r.reason), durationMs: 0 }
    );

    const failed = finalResults.filter(r => !r.ok);
    if (failed.length > 0) {
      console.warn(`[NotificationPublisher] ${failed.length}/${finalResults.length} channel(s) failed:`, failed.map(f => `${f.channel}: ${f.error}`));
    }

    return finalResults;
  }

  get providerCount(): number {
    return this.providers.length;
  }
}
