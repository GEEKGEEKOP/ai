import json

# بارگذاری داده‌های JSON
with open("messages.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# فیلتر کردن داده‌ها: نگه داشتن فقط آنهایی که کلید "text" دارای مقدار معتبر است
cleaned_data = [item for item in data if isinstance(item.get("text"), str) and item.get("text").strip()]

# ذخیره داده‌های تمیز شده در یک فایل جدید
with open("cleaned_messages.json", "w", encoding="utf-8") as f:
    json.dump(cleaned_data, f, ensure_ascii=False, indent=4)

print(f"تمیزسازی انجام شد. تعداد کل داده‌ها: {len(data)}. تعداد داده‌های باقی‌مانده: {len(cleaned_data)}.")

