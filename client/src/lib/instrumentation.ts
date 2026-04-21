import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Capacitor } from '@capacitor/core';

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

/**
 * يتحقق من توافر Plugin معين على المنصة الحالية
 * مع اصطياد أي خطأ محتمل.
 */
function isPluginAvailable(name: string): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable(name);
  } catch {
    return false;
  }
}

export async function initializeInstrumentation() {
  let deviceInfo: Record<string, unknown> = {};
  let appInfo: Record<string, unknown> = {};

  if (Capacitor.isNativePlatform()) {
    try {
      if (isPluginAvailable('Device')) {
        const { Device } = await import('@capacitor/device');
        deviceInfo = (await Device.getInfo().catch(() => ({}))) as Record<string, unknown>;
      }
      if (isPluginAvailable('App')) {
        const { App } = await import('@capacitor/app');
        appInfo = (await App.getInfo().catch(() => ({}))) as Record<string, unknown>;
      }
    } catch (e) {
      console.warn('[instrumentation] Failed to get native device/app info:', e);
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
        /https?:\/\/.*binarjoinanalytic\.info/,
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
