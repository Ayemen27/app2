import sys
import json
import os

# إضافة مسار libs للبحث عن AgentForge
sys.path.append(os.path.join(os.getcwd(), 'libs'))

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No message provided"}))
        return

    message = sys.argv[1]
    
    try:
        # محاكاة بسيطة حالياً لاستدعاء AgentForge
        # في المستقبل سيتم استدعاء الوظائف الفعلية من libs/AgentForge
        response = {
            "message": f"تم استلام رسالتك: {message}. أنا وكيل AgentForge وأقوم بتحليل البيانات حالياً.",
            "steps": [
                {"title": "استلام الرسالة", "status": "completed"},
                {"title": "تحليل السياق", "status": "completed"},
                {"title": "البحث في قاعدة البيانات", "status": "in_progress"}
            ]
        }
        print(json.dumps(response))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
