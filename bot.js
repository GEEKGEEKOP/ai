const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const Vec3 = require('vec3')

// ایجاد ربات با استفاده از Mineflayer
function createBot() {
  const bot = mineflayer.createBot({
    host: 'localhost',    // آدرس سرور (یا آدرس دلخواه)
    port: 35159,          // پورت سرور
    username: 'BotName',  // نام ربات (می‌توانید آن را تغییر دهید)
    version: '1.16.4'     // نسخه بازی پیشنهادی
  })

  // بارگذاری پلاگین pathfinder
  bot.loadPlugin(pathfinder)

  // وقتی ربات وارد بازی شد:
  bot.once('spawn', () => {
    // تنظیم حرکات پیش‌فرض برای pathfinder
    const defaultMovements = new Movements(bot)
    bot.pathfinder.setMovements(defaultMovements)

    bot.chat("ربات وارد بازی شد و آماده کار است!")
    // فراخوانی تابع استخراج درخت
    mineTree(bot)
  })

  bot.on('error', (err) => console.log(err))
  bot.on('end', () => console.log('ربات از بازی خارج شد'))
}

// تابع استخراج درخت: پیدا کردن بلوک‌های چوب و کندن آن‌ها به صورت بازگشتی
async function mineTree(bot) {
  // پیدا کردن بلوک‌های چوب (log) در نزدیکی ربات
  const logs = bot.findBlocks({
    matching: block => block && block.name.includes('log'),
    maxDistance: 32, // شعاع جستجو
    count: 10        // حداکثر تعداد بلوک‌های پیدا شده
  })

  if (logs.length === 0) {
    bot.chat("هیچ درختی پیدا نشد!")
    return
  }

  // انتخاب اولین بلوک چوب به عنوان نقطه شروع
  const startBlock = bot.blockAt(logs[0])
  const visited = new Set()

  // تابع بازگشتی برای کندن بلوک‌های مرتبط با درخت
  async function digLog(block) {
    if (!block) return
    const posKey = `${block.position.x},${block.position.y},${block.position.z}`
    if (visited.has(posKey)) return
    if (!block.name.includes('log')) return
    visited.add(posKey)

    // در صورت فاصله زیاد از بلوک، با استفاده از pathfinder به آن نزدیک می‌شویم
    const distance = bot.entity.position.distanceTo(block.position)
    if (distance > 3) {
      const { GoalBlock } = goals
      await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z))
    }

    // تلاش برای کندن بلوک
    try {
      await bot.dig(block)
      bot.chat(`بلوکی در ${block.position} کندن شد`)
    } catch (err) {
      console.error("خطا در کندن بلوک:", err)
    }

    // بررسی جهت‌های اطراف (بالا، پایین، چپ، راست، جلو، عقب) برای ادامه روند کندن بلوک‌های چوب
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

// راه‌اندازی ربات
createBot()

