from bs4 import BeautifulSoup
import json

# خواندن فایل HTML
with open("messages.html", "r", encoding="utf-8") as f:
    html_content = f.read()

# پارس کردن HTML
soup = BeautifulSoup(html_content, "lxml")

# پیدا کردن بخش تاریخچه (history) که پیام‌ها در آن قرار دارند
history_div = soup.find("div", class_="history")
messages = history_div.find_all("div", class_="message")

data = []

for message in messages:
    msg = {}
    msg["id"] = message.get("id")
    msg["classes"] = message.get("class")
    
    # استخراج نام فرستنده (اگر موجود باشد)
    sender_div = message.find("div", class_="from_name")
    msg["sender"] = sender_div.get_text(strip=True) if sender_div else None
    
    # استخراج تاریخ و زمان (اگر موجود باشد)
    date_div = message.find("div", class_="pull_right date details")
    if date_div:
        # اگر تگ دارای attribute 'title' باشد از آن استفاده می‌کنیم، در غیر این صورت متن داخل تگ
        msg["time"] = date_div.get("title", date_div.get_text(strip=True))
    else:
        msg["time"] = None
    
    # استخراج متن پیام
    text_div = message.find("div", class_="text")
    msg["text"] = text_div.get_text(separator=" ", strip=True) if text_div else None
    
    data.append(msg)

# ذخیره اطلاعات استخراج شده در یک فایل JSON
with open("messages.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("اطلاعات با موفقیت در messages.json ذخیره شدند.")

