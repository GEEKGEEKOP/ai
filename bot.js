const mineflayer = require('mineflayer');

// تنظیمات ربات
const bot = mineflayer.createBot({
    host: 'localhost', // آدرس سرور (برای لوکال همینو بذار)
    port: 35759,      // پورت سرور (پیش‌فرض ماینکرفته)
    username: 'TreeBot',
});

// وقتی ربات وارد بازی شد
bot.on('spawn', () => {
    console.log('Bot is here !');
});


// تابع کمکی برای ایجاد تأخیر
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// تابعی که به صورت غیرهمزمان یک بلوک dirt را پیدا کرده و ماین می‌کند
async function digDirtAsync() {
  while (true) {
    const dirtBlock = bot.findBlock({
      matching: block => block.name === 'dirt',
      maxDistance: 10
    });
    if (dirtBlock) {
      await new Promise((resolve) => {
        bot.dig(dirtBlock, (err) => {
          if (err) {
            console.log("خطا در ماین کردن dirt:", err);
          } else {
            console.log("Dirt ماین شد!");
          }
          resolve();
        });
      });
      return; // پس از موفقیت یا تلاش ناموفق، از حلقه خارج شو
    } else {
      console.log("هیچ dirt در نزدیکی یافت نشد، حرکت به جلو...");
      bot.setControlState('forward', true);
      await delay(1000); // حرکت به جلو به مدت ۱ ثانیه
      bot.setControlState('forward', false);
      await delay(500); // کمی صبر کن تا وضعیت بروزرسانی شود
    }
  }
}

/*
// وقتی چت کنن باهاش
bot.on('chat', (username, message) => {
    if (message === 'chop') {
        findAndChopTree(); // دستور برای زدن درخت
    }
    if (message === 'mine dirt') {


    }
});*/



bot.once('spawn', async () => {
  // استفاده از حلقه for برای 64 بار تلاش جهت ماین کردن dirt
  for (let i = 0; i < 64; i++) {
    await digDirtAsync();
    console.log(`تعداد dirt جمع‌آوری شده: ${i + 1}`);
  }
  console.log("64 dirt جمع شد!");
});
