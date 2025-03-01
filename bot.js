const mineflayer = require('mineflayer');

// تنظیمات ربات
const bot = mineflayer.createBot({
    host: 'localhost', // آدرس سرور (برای لوکال همینو بذار)
    port: 38303,      // پورت سرور (پیش‌فرض ماینکرفته)
    username: 'TreeBot',
});

// وقتی ربات وارد بازی شد
bot.on('spawn', () => {
    console.log('Bot is here !');
});

const Vec3 = require('vec3')

async function mineTree(bot) {
  // پیدا کردن بلوک‌های چوب (log) در نزدیکی ربات
  const logs = bot.findBlocks({
    matching: block => block && block.name.includes('log'),
    maxDistance: 32, // شعاع جستجو
    count: 10      // حداکثر تعداد بلوک‌های پیدا شده
  })

  if (logs.length === 0) {
    bot.chat("هیچ درختی پیدا نشد!")
    return
  }

  // استفاده از اولین بلوک چوب به عنوان نقطه شروع
  const startBlock = bot.blockAt(logs[0])
  const visited = new Set()

  // تابع بازگشتی برای کندن بلوک‌های درخت
  async function digLog(block) {
    if (!block) return
    const posKey = `${block.position.x},${block.position.y},${block.position.z}`
    if (visited.has(posKey)) return
    if (!block.name.includes('log')) return
    visited.add(posKey)

    // اگر بلوک دور است، با استفاده از pathfinder به آن نزدیک می‌شویم
    const distance = bot.entity.position.distanceTo(block.position)
    if (distance > 3) {
      const { GoalBlock } = require('mineflayer-pathfinder').goals
      await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z))
    }

    // کندن بلوک
    try {
      await bot.dig(block)
      bot.chat(`بلوکی در ${block.position} کندن شد`)
    } catch (err) {
      console.error("خطا در کندن بلوک:", err)
    }

    // بررسی بلوک‌های همجوار (شش جهت اصلی) برای ادامه کندن درخت
    const directions = [
      new Vec3(1, 0, 0),
      new Vec3(-1, 0, 0),
      new Vec3(0, 1, 0),
      new Vec3(0, -1, 0),
      new Vec3(0, 0, 1),
      new Vec3(0, 0, -1)
    ]

    for (const dir of directions) {
      const neighborPos = block.position.plus(dir)
      const neighborBlock = bot.blockAt(neighborPos)
      if (neighborBlock && neighborBlock.name.includes('log')) {
         await digLog(neighborBlock)
      }
    }
  }

  await digLog(startBlock)
}


bot.once('spawn', async () => {
  // استفاده از حلقه for برای 64 بار تلاش جهت ماین کردن dirt
  //for (let i = 0; i < 64; i++) {
  await mineTree();
  //  console.log(`تعداد dirt جمع‌آوری شده: ${i + 1}`);
  //}
  console.log("64 dirt جمع شد!");
});
