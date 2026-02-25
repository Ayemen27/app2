import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';

async function initializeInstrumentation() {
  const [deviceInfo, appInfo] = await Promise.all([
    Device.getInfo().catch(() => ({})),
    App.getInfo().catch(() => ({})),
  ]);

  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'aiops-frontend',
      'device.model': (deviceInfo as any).model || 'unknown',
      'device.platform': (deviceInfo as any).platform || 'web',
      'device.version': (deviceInfo as any).osVersion || 'unknown',
      'app.version': (appInfo as any).version || 'unknown',
      'app.build': (appInfo as any).build || 'unknown',
    }),
  });

  // For mobile, we might need a non-localhost endpoint if testing on a real device
  // but for hybrid apps, they often talk to the same backend.
  const exporter = new OTLPTraceExporter({
    url: '/api/v1/traces', // Proxy through backend or use full URL if known
  });

  if (typeof provider.addSpanProcessor === 'function') {
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  } else {
    console.warn('addSpanProcessor is not available on provider, skipping BatchSpanProcessor registration.');
  }
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

  console.log('OTEL Frontend Instrumentation Initialized with Device Info:', deviceInfo);
}

initializeInstrumentation().catch(err => {
  console.error('Failed to initialize OTEL instrumentation:', err);
});
