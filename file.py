import torch
import torch.nn as nn
import pickle
from collections import defaultdict
import os

# تعریف داده‌های گفت‌وگو به صورت سراسری
dialogues = [
    ("پرسشگر 1", "سلام، چطوری؟"),
    ("پرسشگر 2", "خوبم، مرسی! تو چطوری؟"),
    ("پرسشگر 1", "خوبم، می‌خواستم درباره پروژه جدید صحبت کنیم."),
    ("پرسشگر 2", "بله، حتماً! در مورد چی صحبت کنیم؟")
]

# مدل LSTM ساده
class ChatbotModel(nn.Module):
    def __init__(self, vocab_size, embedding_dim=16, hidden_dim=32):
        super(ChatbotModel, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, vocab_size)

    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        output = self.fc(lstm_out[:, -1, :])  # فقط خروجی آخرین کلمه
        return output

# تابع بارگذاری داده‌ها و مدل
def load_data_and_model():
    try:
        with open('word2idx.pkl', 'rb') as f:
            word2idx = pickle.load(f)
        with open('idx2word.pkl', 'rb') as f:
            idx2word = pickle.load(f)
        model = ChatbotModel(vocab_size=len(word2idx))
        model.load_state_dict(torch.load('chatbot_model.pth'))
        model.eval()
        return model, word2idx, idx2word
    except (FileNotFoundError, EOFError):
        raise FileNotFoundError("Stored model or data not found or is empty.")

# تابع ذخیره داده‌ها و مدل
def save_data_and_model(model, word2idx, idx2word):
    if model is not None:
        torch.save(model.state_dict(), 'chatbot_model.pth')
    with open('word2idx.pkl', 'wb') as f:
        pickle.dump(word2idx, f)
    with open('idx2word.pkl', 'wb') as f:
        pickle.dump(idx2word, f)

# تلاش برای بارگذاری مدل و داده‌ها
try:
    model, word2idx, idx2word = load_data_and_model()
    print("مدل و داده‌ها بارگذاری شدند.")
except FileNotFoundError:
    print("مدل و داده‌ها پیدا نشد یا فایل‌ها خالی هستند، پردازش و ذخیره آن‌ها در حال انجام است...")
    
    # ایجاد دیکشنری‌های معمولی برای ذخیره کلمات
    word2idx = {}
    idx2word = {}
    for participant, message in dialogues:
        for word in message.split():
            if word not in word2idx:
                idx = len(word2idx)
                word2idx[word] = idx
                idx2word[idx] = word

    vocab_size = len(word2idx)
    model = ChatbotModel(vocab_size)
    
    save_data_and_model(model, word2idx, idx2word)
    print("مدل و داده‌ها ذخیره شدند.")
    
    # پس از ذخیره، بارگذاری مجدد انجام می‌دهیم
    model, word2idx, idx2word = load_data_and_model()

# تابع برای پیش‌بینی پاسخ
def predict(dialogue):
    with torch.no_grad():
        # تبدیل جمله ورودی به توکن‌ها
        encoded = [word2idx[word] for word in dialogue.split() if word in word2idx]
        # محاسبه max_len از داده‌های گفت‌وگو (برای پر کردن)
        max_len = max(len(message.split()) for _, message in dialogues)
        padded = encoded + [0]*(max_len - len(encoded))
        input_tensor = torch.tensor([padded])
        output = model(input_tensor)
        pred_idx = torch.argmax(output, dim=1).item()
        return idx2word.get(pred_idx, "پاسخ مشخصی پیدا نشد.")


print(predict("چطوری؟"))

while True:
    in_=input()
    print(predict(in_))
    print("---------------------------------------")

