from PIL import Image
import os
import glob

def crop_assets(image_path):
    try:
        if not os.path.exists(image_path):
            # Try to find any image if the exact path doesn't exist
            possible_images = glob.glob("attached_assets/*.png") + glob.glob("attached_assets/*.jpg")
            if possible_images:
                image_path = possible_images[0]
                print(f"Using found image: {image_path}")
            else:
                print(f"Error: No image found at {image_path} or in attached_assets/")
                return

        # فتح الصورة الأصلية
        img = Image.open(image_path)
        width, height = img.size
        
        # إنشاء مجلدات للمخرجات
        # We will save to public/assets and src/assets as per Replit standards
        output_dirs = ["client/public/assets", "client/src/assets/images"]
        for d in output_dirs:
            if not os.path.exists(d):
                os.makedirs(d)

        print(f"Original Image Size: {width}x{height}")

        # === تعريف الإحداثيات التقديرية (Box Tuple: left, upper, right, lower) ===
        assets = {
            "logo_header_light.png": (int(width * 0.03), int(height * 0.82), int(width * 0.35), int(height * 0.96)),
            "app_icon_light.png": (int(width * 0.38), int(height * 0.80), int(width * 0.48), int(height * 0.96)),
            "favicon.png": (int(width * 0.04), int(height * 0.61), int(width * 0.09), int(height * 0.69)),
            "splash_screen_light.png": (int(width * 0.34), int(height * 0.05), int(width * 0.49), int(height * 0.52)),
            "logo_header_dark.png": (int(width * 0.53), int(height * 0.82), int(width * 0.85), int(height * 0.96)),
            "app_icon_dark.png": (int(width * 0.88), int(height * 0.80), int(width * 0.98), int(height * 0.96)),
        }

        # === تنفيذ القص والحفظ ===
        for name, box in assets.items():
            cropped_img = img.crop(box)
            
            # Save to both public (for direct access) and src (for imports)
            for d in output_dirs:
                save_path = os.path.join(d, name)
                cropped_img.save(save_path)
                print(f"Saved: {save_path}")

        print("\n✅ تمت العملية بنجاح!")

    except Exception as e:
        print(f"حدث خطأ: {e}")

# Try to find the image provided by user or use the most recent one
image_file = "attached_assets/1769701687558_1769701889851.png"
crop_assets(image_file)
