#!/bin/bash

# 🤖 سكريبت ذكي: يختار الطريقة المناسبة تلقائياً

set -e

# 🔐 قراءة بيانات الاتصال
SSH_USER="${SSH_USER}"
SSH_HOST="${SSH_HOST}"
SSH_PORT="${SSH_PORT}"
SSH_PASSWORD="${SSH_PASSWORD}"
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY}"

echo "🚀 بناء التطبيق على السيرفر الخارجي (وضع ذكي)"
echo ""

# ✅ التحقق من المتطلبات
if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ] || [ -z "$SSH_PORT" ]; then
    echo "❌ خطأ: بيانات SSH غير مكتملة"
    echo ""
    echo "📝 تأكد من إضافة المتغيرات إلى Secrets:"
    echo "  1. SSH_USER      - اسم المستخدم"
    echo "  2. SSH_HOST      - عنوان السيرفر"
    echo "  3. SSH_PORT      - منفذ SSH"
    echo "  4. SSH_PASSWORD  - كلمة المرور (اختياري)"
    echo "  5. SSH_PUBLIC_KEY - المفتاح العام (اختياري)"
    echo ""
    exit 1
fi

echo "📝 معلومات الاتصال:"
echo "  👤 User: $SSH_USER"
echo "  🖥️  Host: $SSH_HOST"
echo "  🔌 Port: $SSH_PORT"
echo ""

# 🤖 اختيار الطريقة المناسبة
if [ -n "$SSH_PUBLIC_KEY" ]; then
    echo "🔑 اكتشفت SSH Public Key - سأستخدم الطريقة الآمنة"
    echo "   🔒 بدون الحاجة لكلمة مرور"
    echo ""
    
    # استدعاء السكريبت الثاني
    exec ./build-remote-key.sh
    
elif [ -n "$SSH_PASSWORD" ]; then
    echo "🔐 اكتشفت SSH Password - سأستخدم الطريقة السريعة"
    echo "   ⚠️  تأكد من أن sshpass مثبت"
    echo ""
    
    # التحقق من sshpass
    if ! command -v sshpass &> /dev/null; then
        echo "❌ خطأ: sshpass غير مثبت"
        echo ""
        echo "🔧 الحل:"
        echo "  1. استخدم SSH Key بدل الكلمة المرور (أكثر أماناً)"
        echo "  2. أو ثبّت sshpass:"
        echo "     apt-get install sshpass"
        echo ""
        exit 1
    fi
    
    # استدعاء السكريبت الأول
    exec ./build-remote.sh
    
else
    echo "❌ خطأ: لا توجد طريقة للمصادقة"
    echo ""
    echo "📝 أضف أحد المتغيرات إلى Secrets:"
    echo "  ✅ SSH_PASSWORD   - للمصادقة برمز"
    echo "  ✅ SSH_PUBLIC_KEY - للمصادقة بمفتاح (مفضل)"
    echo ""
    exit 1
fi
