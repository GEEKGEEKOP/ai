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


function mineDirt() {
  let dirtCount = 0;

  function digNext() {
    if (dirtCount >= 64) {
      console.log('64 dirt جمع شد!');
      return;
    }

    const dirtBlock = bot.findBlock({
      matching: block => block.name === 'dirt',
      maxDistance: 10
    });

    if (dirtBlock) {
      bot.dig(dirtBlock, (err) => {
        if (err) {
          console.log('خطا در ماین کردن dirt:', err);
        } else {
          dirtCount++;
          console.log(`Dirt ماین شد! تعداد جمع‌آوری شده: ${dirtCount}`);
        }
        setTimeout(digNext, 500); // تاخیر برای جلوگیری از گیر کردن
      });
    } else {
      console.log('هیچ dirt در نزدیکی یافت نشد، تلاش مجدد در 2 ثانیه...');
      setTimeout(digNext, 2000); // اگر dirt پیدا نشد، بعد از ۲ ثانیه دوباره تلاش کن
    }
  }

  digNext();
}



// وقتی چت کنن باهاش
bot.on('chat', (username, message) => {
    if (message === 'chop') {
        findAndChopTree(); // دستور برای زدن درخت
    }
    if (message === 'mine dirt') {
        mineDirt(); // دستور برای زدن درخت
    }
});
