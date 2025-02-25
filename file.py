import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer, Trainer, TrainingArguments, TextDataset, DataCollatorForLanguageModeling

def load_data(file_path, tokenizer, block_size=512):
    dataset = TextDataset(
        tokenizer=tokenizer,
        file_path=file_path,
        block_size=block_size
    )
    return dataset

def train_gpt2(data_path, model_name='gpt2', output_dir='./gpt2_finetuned'):
    tokenizer = GPT2Tokenizer.from_pretrained(model_name)
    model = GPT2LMHeadModel.from_pretrained(model_name)
    
    dataset = load_data(data_path, tokenizer)
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False
    )
    
    training_args = TrainingArguments(
        output_dir=output_dir,
        overwrite_output_dir=True,
        num_train_epochs=3,
        per_device_train_batch_size=2,
        save_steps=10_000,
        save_total_limit=2,
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        data_collator=data_collator
    )
    
    trainer.train()
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

def generate_text(prompt, model_path='./gpt2_finetuned', max_length=100):
    tokenizer = GPT2Tokenizer.from_pretrained(model_path)
    model = GPT2LMHeadModel.from_pretrained(model_path)
    
    inputs = tokenizer.encode(prompt, return_tensors='pt')
    output = model.generate(inputs, max_length=max_length, num_return_sequences=1)
    
    return tokenizer.decode(output[0], skip_special_tokens=True)



#def generate_text(prompt, model_path='./gpt2_finetuned', max_length=100):
#    tokenizer = GPT2Tokenizer.from_pretrained(model_path)
#    model = GPT2LMHeadModel.from_pretrained(model_path)
#    
#    # تنظیم pad_token_id
#    model.config.pad_token_id = tokenizer.eos_token_id
#
#    # توکنایز کردن ورودی
#    inputs = tokenizer.encode(prompt, return_tensors='pt', padding=True, truncation=True)
#    
#    # تولید متن با استفاده از مدل
#    output = model.generate(inputs, max_length=max_length, num_return_sequences=1, attention_mask=inputs["attention_mask"])
#    
#    return tokenizer.decode(output[0], skip_special_tokens=True)




# آموزش مدل با داده‌های خودت
train_gpt2('data.txt')

while True:
    in_=input()
    generated_text = generate_text(in_)
    print(generated_text)
    print("------------------------------------")

