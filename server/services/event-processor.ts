import { log } from "../static";

/**
 * Event Processor Service
 * Handles telemetry data enrichment and pain scoring.
 */
export class EventProcessor {
  private static instance: EventProcessor;

  private constructor() {}

  public static getInstance(): EventProcessor {
    if (!EventProcessor.instance) {
      EventProcessor.instance = new EventProcessor();
    }
    return EventProcessor.instance;
  }

  /**
   * Calculates a pain score for an event
   * score = log(users_affected + 1) * severity_weight * error_rate_multiplier
   */
  public calculateScore(data: { usersAffected: number; severity: number; errorRate: number }): number {
    const score = Math.log(data.usersAffected + 1) * data.severity * data.errorRate;
    log(`Calculated Pain Score: ${score}`);
    return score;
  }

  public async processTelemetry(rawEvent: any) {
    // Logic for Kafka production and enrichment
    const enrichedEvent = {
      ...rawEvent,
      processedAt: new Date().toISOString(),
      painScore: rawEvent.usersAffected ? this.calculateScore(rawEvent) : 0,
      version: "1.0.0"
    };
    
    log(`[Kafka] Producing enriched event to topic 'telemetry-events': ${JSON.stringify(enrichedEvent)}`);
    // Here we would normally use a Kafka client like kafkajs
    return enrichedEvent;
  }
}

export const eventProcessor = EventProcessor.getInstance();
