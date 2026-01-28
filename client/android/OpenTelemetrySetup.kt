import io.opentelemetry.api.OpenTelemetry
import io.opentelemetry.sdk.OpenTelemetrySdk
import io.opentelemetry.sdk.trace.SdkTracerProvider
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor

class OpenTelemetrySetup {
    companion object {
        fun init(endpoint: String): OpenTelemetry {
            val exporter = OtlpGrpcSpanExporter.builder()
                .setEndpoint(endpoint)
                .build()

            val spanProcessor = BatchSpanProcessor.builder(exporter).build()

            val tracerProvider = SdkTracerProvider.builder()
                .addSpanProcessor(spanProcessor)
                .build()

            return OpenTelemetrySdk.builder()
                .setTracerProvider(tracerProvider)
                .buildAndRegisterGlobal()
        }
    }
}
