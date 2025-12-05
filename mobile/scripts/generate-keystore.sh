#!/bin/bash

set -e

echo "🔐 إنشاء Keystore للتوقيع..."
echo "=============================="

KEYSTORE_DIR="$(dirname "$0")/../keystores"
mkdir -p "$KEYSTORE_DIR"

read -p "📛 اسم التطبيق (بالإنجليزية): " APP_NAME
read -p "🏢 اسم الشركة: " COMPANY_NAME
read -p "🌆 المدينة: " CITY
read -p "🏳️ البلد (رمز من حرفين، مثل SA): " COUNTRY
read -sp "🔑 كلمة مرور Keystore: " KEYSTORE_PASSWORD
echo ""
read -sp "🔑 كلمة مرور المفتاح (يمكن أن تكون نفسها): " KEY_PASSWORD
echo ""

KEYSTORE_NAME="${APP_NAME// /-}-release.keystore"
KEYSTORE_PATH="$KEYSTORE_DIR/$KEYSTORE_NAME"
KEY_ALIAS="${APP_NAME// /-}-key"

if [ -f "$KEYSTORE_PATH" ]; then
    echo "⚠️ الملف موجود مسبقاً: $KEYSTORE_PATH"
    read -p "هل تريد استبداله؟ (y/n): " REPLACE
    if [ "$REPLACE" != "y" ]; then
        echo "تم الإلغاء."
        exit 0
    fi
    rm "$KEYSTORE_PATH"
fi

echo ""
echo "🔨 إنشاء Keystore..."

keytool -genkey -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=$APP_NAME, OU=Mobile, O=$COMPANY_NAME, L=$CITY, ST=$CITY, C=$COUNTRY"

echo ""
echo "✅ تم إنشاء Keystore بنجاح!"
echo ""
echo "📍 المسار: $KEYSTORE_PATH"
echo "🏷️ Alias: $KEY_ALIAS"
echo ""
echo "⚠️ تحذير مهم:"
echo "   - احتفظ بهذا الملف في مكان آمن!"
echo "   - لا ترفعه للـ Git أبداً!"
echo "   - إذا فقدته، لن تستطيع تحديث التطبيق على Play Store!"
echo ""
echo "📋 أضف هذه المتغيرات للبيئة:"
echo "   export KEYSTORE_PATH=\"$KEYSTORE_PATH\""
echo "   export KEYSTORE_PASSWORD=\"****\""
echo "   export KEY_ALIAS=\"$KEY_ALIAS\""
echo "   export KEY_PASSWORD=\"****\""
echo ""

echo "$KEYSTORE_NAME" >> "$KEYSTORE_DIR/.gitignore"
echo "*.keystore" >> "$KEYSTORE_DIR/.gitignore"

echo "🎉 انتهى!"
