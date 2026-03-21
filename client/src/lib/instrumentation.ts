import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Capacitor } from '@capacitor/core';

export async function initializeInstrumentation() {
  let deviceInfo: Record<string, any> = {};
  let appInfo: Record<string, any> = {};

  if (Capacitor.isNativePlatform()) {
    try {
      if (Capacitor.isPluginAvailable('Device')) {
        const { Device } = await import('@capacitor/device');
        deviceInfo = await Device.getInfo().catch(() => ({}));
      }
      if (Capacitor.isPluginAvailable('App')) {
        const { App } = await import('@capacitor/app');
        appInfo = await App.getInfo().catch(() => ({}));
        console.log(`[instrumentation] App.getInfo() result:`, JSON.stringify(appInfo));
      }
    } catch (e) {
      console.warn('[instrumentation] Failed to get native info:', e);
    }
  }

  const exporter = new OTLPTraceExporter({
    url: '/api/v1/traces',
  });

  const spanProcessor = new BatchSpanProcessor(exporter as any);

  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'aiops-frontend',
      'device.model': (deviceInfo as any).model || 'unknown',
      'device.platform': (deviceInfo as any).platform || 'web',
      'device.version': (deviceInfo as any).osVersion || 'unknown',
      'app.version': (appInfo as any).version || 'unknown',
      'app.build': (appInfo as any).build || 'unknown',
    }) as any,
    spanProcessors: [spanProcessor],
  } as any);

  provider.register();

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [
          /https?:\/\/.*binarjoinanelytic\.info/,
          /https?:\/\/.*axion\.app/
        ],
      }),
      new XMLHttpRequestInstrumentation(),
    ],
  });
}
