import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode, type Span } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Capacitor } from '@capacitor/core';
import { trace, context } from '@opentelemetry/api';

/**
 * يتحقق من إمكانية تغليف XMLHttpRequest بأمان.
 *
 * عند تفعيل CapacitorHttp يُستبدل XMLHttpRequest الأصلي بتنفيذ بديل
 * لا يحتوي على open/send كدوال قابلة للتغليف بالطريقة المعتادة،
 * مما يُسبب الخطأ "no original function open to wrap".
 * نتجنب تسجيل XMLHttpRequestInstrumentation في هذه الحالة
 * ونكتفي بـ FetchInstrumentation التي تعمل بشكل صليم على Capacitor.
 */
function isXhrPatchable(): boolean {
  try {
    const proto = XMLHttpRequest.prototype;
    return (
      typeof proto.open === 'function' &&
      typeof proto.send === 'function' &&
      !('_isCapacitorNativeHttp' in proto) &&
      !('_capacitorPatched' in proto)
    );
  } catch {
    return false;
  }
}

// ملاحظة: لا نستخدم isPluginAvailable() — لا تعمل في Capacitor 8. نستدعي مباشرة.

export async function initializeInstrumentation() {
  let deviceInfo: Record<string, unknown> = {};
  let appInfo: Record<string, unknown> = {};

  if (Capacitor.isNativePlatform()) {
    try {
      const { Device } = await import('@capacitor/device');
      deviceInfo = (await Device.getInfo().catch(() => ({}))) as Record<string, unknown>;
    } catch (e) {
      console.warn('[instrumentation] Device plugin unavailable:', e);
    }
    try {
      const { App } = await import('@capacitor/app');
      appInfo = (await App.getInfo().catch(() => ({}))) as Record<string, unknown>;
    } catch (e) {
      console.warn('[instrumentation] App plugin unavailable:', e);
    }
  }

  const exporter = new OTLPTraceExporter({
    url: '/api/v1/traces',
  });

  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'aiops-frontend',
      'device.model': (deviceInfo as any).model || 'unknown',
      'device.platform': (deviceInfo as any).platform || 'web',
      'device.version': (deviceInfo as any).osVersion || 'unknown',
      'app.version': (appInfo as any).version || 'unknown',
      'app.build': (appInfo as any).build || 'unknown',
    }) as any,
    spanProcessors: [new BatchSpanProcessor(exporter as any)],
  } as any);

  provider.register();

  /*
   * على المنصات الأصلية (Android/iOS) يُفعِّل Capacitor تلقائياً
   * تغليف XMLHttpRequest عبر CapacitorHttp، مما يُعطّل تغليف
   * OpenTelemetry الإضافي. نكتفي هنا بـ FetchInstrumentation
   * التي تعمل بشكل سليم في كلتا البيئتين.
   *
   * على متصفحات الويب نُضيف XMLHttpRequestInstrumentation
   * بعد التحقق من إمكانية التغليف.
   */
  const instrumentations = [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /https?:\/\/.*binarjoinanelytic\.info/,
        /https?:\/\/.*axion\.app/,
      ],
    }),
  ];

  if (!Capacitor.isNativePlatform() && isXhrPatchable()) {
    instrumentations.push(new XMLHttpRequestInstrumentation() as any);
  }

  registerInstrumentations({ instrumentations });

  console.log('[instrumentation] INSTRUMENTATION_OK: Instrumentation initialized', {
    platform: Capacitor.isNativePlatform() ? 'native' : 'web',
    xhrPatched: !Capacitor.isNativePlatform() && isXhrPatchable(),
  });
}

/**
 * إنشاء Sync Span لـ OpenTelemetry
 */
export function createSyncSpan(operationName: string, attributes?: Record<string, any>): Span {
  const tracer = trace.getTracer('aiops-sync');
  const span = tracer.startSpan(`sync.${operationName}`, {
    attributes: {
      'component': 'sync',
      ...attributes
    }
  });
  return span as Span;
}

export { SpanStatusCode };
