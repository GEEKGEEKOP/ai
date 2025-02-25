import json

# بارگذاری داده‌های تمیز شده
with open("data/cleaned_messages_2.json", "r", encoding="utf-8") as f:
    data = json.load(f)


dialogs = []
for item in data:
    sender = item.get("sender", "Unknown")
    text = item.get("text")

    # بررسی اینکه مقدار text یک رشته است و مقدار معتبری دارد
    if isinstance(text, str):
        text = text.strip()
        if text:  # اگر متن خالی نبود، آن را اضافه کن
            dialogs.append((sender, text))

# چاپ خروجی به صورت یک متغیر پایتون
print("dialogs =", dialogs)
