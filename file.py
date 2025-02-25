import tensorflow as tf
from tensorflow.keras import layers, models
import numpy as np

# داده‌های آموزشی (سوالات و پاسخ‌ها)
questions = ["سلام", "چطوری؟", "سایت شما چیه؟", "چطور عضو بشم؟"]
answers = ["سلام! چطور میتونم کمکت کنم؟", "خوبم، مرسی!", "این سایت برای یادگیری هوش مصنوعی هست.", "برای عضویت روی دکمه ثبت‌نام کلیک کن."]

# توکنایزر برای تبدیل کلمات به توکن‌ها
tokenizer = tf.keras.preprocessing.text.Tokenizer()
tokenizer.fit_on_texts(questions + answers)
vocab_size = len(tokenizer.word_index) + 1  # اندازه دیکشنری

# تبدیل سوالات و پاسخ‌ها به توکن‌ها
questions_seq = tokenizer.texts_to_sequences(questions)
answers_seq = tokenizer.texts_to_sequences(answers)

# Padding برای یکنواخت کردن طول دنباله‌ها
max_len = max([len(seq) for seq in questions_seq + answers_seq])
questions_seq = tf.keras.preprocessing.sequence.pad_sequences(questions_seq, maxlen=max_len, padding='post')
answers_seq = tf.keras.preprocessing.sequence.pad_sequences(answers_seq, maxlen=max_len, padding='post')

# مدل LSTM ساده برای پیش‌بینی پاسخ
model = models.Sequential([
    layers.Embedding(vocab_size, 64, input_length=max_len),  # لایه Embedding برای تبدیل توکن‌ها به بردار
    layers.LSTM(64),  # لایه LSTM برای پردازش دنباله
    layers.Dense(vocab_size, activation='softmax')  # لایه خروجی برای پیش‌بینی پاسخ
])

# کامپایل مدل
model.compile(loss='sparse_categorical_crossentropy', optimizer='adam', metrics=['accuracy'])

# آموزش مدل
model.fit(questions_seq, np.array(answers_seq), epochs=100)

# تابع پیش‌بینی پاسخ
def predict_answer(question):
    seq = tokenizer.texts_to_sequences([question])
    seq = tf.keras.preprocessing.sequence.pad_sequences(seq, maxlen=max_len, padding='post')
    pred = model.predict(seq)
    pred_index = np.argmax(pred, axis=-1)[0]
    return tokenizer.index_word.get(pred_index, "پاسخ مشخصی پیدا نشد.")

# تست مدل
print(predict_answer("سلام"))

