
#!/bin/bash

# سكريبت إدارة التطبيقين
# ./manage-apps.sh [start|stop|restart|status|logs]

case "$1" in
    start)
        echo "🚀 بدء تشغيل التطبيقين..."
        
        # التأكد من وجود مجلد السجلات
        mkdir -p logs
        
        # بناء التطبيق
        echo "📦 بناء التطبيق..."
        npm run build
        
        # تشغيل التطبيقين باستخدام PM2
        pm2 start ecosystem.config.json
        
        echo "✅ تم بدء تشغيل التطبيقين بنجاح"
        pm2 status
        ;;
        
    stop)
        echo "🛑 إيقاف التطبيقين..."
        pm2 stop all
        echo "✅ تم إيقاف جميع التطبيقات"
        ;;
        
    restart)
        echo "🔄 إعادة تشغيل التطبيقين..."
        pm2 restart all
        echo "✅ تم إعادة تشغيل جميع التطبيقات"
        pm2 status
        ;;
        
    status)
        echo "📊 حالة التطبيقات:"
        pm2 status
        ;;
        
    logs)
        if [ -n "$2" ]; then
            echo "📋 سجلات التطبيق $2:"
            pm2 logs "$2" --lines 50
        else
            echo "📋 سجلات جميع التطبيقات:"
            pm2 logs --lines 20
        fi
        ;;
        
    monitor)
        echo "📈 مراقبة التطبيقات المباشرة:"
        pm2 monit
        ;;
        
    save)
        echo "💾 حفظ قائمة التطبيقات للتشغيل التلقائي..."
        pm2 save
        pm2 startup
        echo "✅ تم حفظ الإعدادات"
        ;;
        
    *)
        echo "الاستخدام: $0 {start|stop|restart|status|logs [app-name]|monitor|save}"
        echo ""
        echo "الأوامر المتاحة:"
        echo "  start     - بدء تشغيل التطبيقين"
        echo "  stop      - إيقاف التطبيقين"
        echo "  restart   - إعادة تشغيل التطبيقين"
        echo "  status    - عرض حالة التطبيقات"
        echo "  logs      - عرض السجلات"
        echo "  monitor   - مراقبة مباشرة"
        echo "  save      - حفظ للتشغيل التلقائي"
        echo ""
        echo "مثال:"
        echo "  $0 start"
        echo "  $0 logs app2"
        echo "  $0 logs bot-v4"
        exit 1
        ;;
esac
