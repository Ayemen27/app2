import io.sentry.android.core.SentryAndroid
import io.sentry.SentryLevel

class SentrySetup {
    companion object {
        fun init(context: android.content.Context, dsn: String) {
            SentryAndroid.init(context) { options ->
                options.dsn = dsn
                options.tracesSampleRate = 1.0
                options.isEnableUserInteractionTracing = true
                options.setBeforeSend { event, hint ->
                    if (event.level == SentryLevel.DEBUG) null else event
                }
            }
        }
    }
}
