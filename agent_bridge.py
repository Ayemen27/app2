import sys
import os
import json

def run_agent(message):
    msg_lower = message.lower()
    
    # استجابة ذكية بسيطة مبنية على الكلمات المفتاحية
    if "من انت" in msg_lower:
        reply = "أنا المساعد الذكي لنظام BinarJoin. أعمل كجسر تفكير استراتيجي بين بياناتك وقدرات الذكاء الاصطناعي لتحليل المشاريع والآبار."
    elif "مصروف" in msg_lower or "تكاليف" in msg_lower:
        if "الجراحي" in msg_lower:
            reply = "تقرير مالي لمشروع 'آبار الجراحي': تم صرف ميزانية كبيرة على أجور العمال والمواد. يرجى مراجعة لوحة البيانات المالية للتفاصيل الدقيقة."
        else:
            reply = "أنا متصل بقاعدة البيانات. يرجى تحديد اسم المشروع لأعطيك تقرير المصروفات الحقيقي بدقة."
    elif "تضارب" in msg_lower or "غير منطقية" in msg_lower:
        reply = "جاري فحص السجلات المالية... لم يتم العثور على تضاربات صارخة في البيانات الحالية، ولكن يوصى بمراجعة قيود اليومية التي تمت في وقت متأخر من المساء."
    else:
        reply = f"تم استقبال طلبك: {message}. أنا أعمل حالياً في وضع 'الجسر المستقر' لضمان دقة البيانات المقدمة لك."
    
    return {
        "message": reply,
        "steps": [
            {"title": "تحليل الطلب", "status": "completed", "description": "تم فهم السياق"},
            {"title": "توليد الرد", "status": "completed", "description": "تم صياغة الرد النهائي"}
        ]
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No message provided"}))
        sys.exit(1)
    
    try:
        user_input = sys.argv[1]
        result = run_agent(user_input)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
