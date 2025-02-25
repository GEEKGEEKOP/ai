import json

# بارگذاری داده‌های تمیز شده
with open("cleaned_messages_2.json", "r", encoding="utf-8") as f:
    data = json.load(f)

dialogs = []
for item in data:
    sender = item.get("sender", "Unknown")
    text = item.get("text", "").strip()
    # در صورتی که متن موجود نباشد، آن پیام را رد می‌کنیم
    if text:
        dialogs.append((sender, text))

# چاپ خروجی به صورت یک متغیر پایتون
print("dialogs =", dialogs)

