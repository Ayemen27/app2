import sys
import os
import json

def run_agent(message):
    return {
        "message": "عذراً، لا يمكنني تقديم إجابة حالياً لأنني أحتاج للوصول المباشر إلى قاعدة البيانات لضمان دقة الأرقام. يرجى تزويدي بالبيانات الحية من خلال النظام، حيث أن استخدام البيانات الثابتة غير مسموح به.",
        "steps": [
            {"title": "تحليل الطلب", "status": "completed", "description": "تم فهم السياق"},
            {"title": "فحص البيانات", "status": "failed", "description": "البيانات الثابتة غير مسموحة"}
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
