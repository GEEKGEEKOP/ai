const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const Vec3 = require('vec3')

// تابع کمکی برای شمارش بلوک‌های چوب در موجودی ربات
function countWoodLogs(bot) {
  let total = 0
  for (const item of bot.inventory.items()) {
    if (item.name.includes('log')) {
      total += item.count
    }
  }
  return total
}

// ایجاد ربات
function createBot() {
  const bot = mineflayer.createBot({
    host: 'localhost',    // آدرس سرور
    port: 35159,          // پورت سرور
    username: 'BotName',  // نام ربات
    version: '1.16.4'     // نسخه بازی پیشنهادی
  })

  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    const defaultMovements = new Movements(bot)
    bot.pathfinder.setMovements(defaultMovements)
    bot.chat("ربات وارد بازی شد و آماده کار است!")
    // شروع عملیات استخراج تا رسیدن به 64 بلوک چوب
    mine64Logs(bot).catch(err => console.error(err))
  })

  bot.on('error', (err) => console.log(err))
  bot.on('end', () => console.log('ربات از بازی خارج شد'))
}

// تابع بازگشتی برای کندن یک کلاستر (درخت) از بلوک‌های چوب
async function digLog(bot, block, visited, stopCallback) {
  if (!block) return
  const posKey = `${block.position.x},${block.position.y},${block.position.z}`
  if (visited.has(posKey)) return
  if (!block.name.includes('log')) return
  visited.add(posKey)

  // اگر موجودی 64 بلوک چوب یا بیشتر شده باشد، عملیات متوقف می‌شود
  if (countWoodLogs(bot) >= 64) {
    stopCallback()
    return
  }

  // اگر بلوک دور باشد، ربات به آن نزدیک می‌شود
  const distance = bot.entity.position.distanceTo(block.position)
  if (distance > 3) {
    const { GoalBlock } = goals
    try {
      await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z))
    } catch (err) {
      console.error("خطا در رفتن به بلوک:", err)
    }
  }

  // تلاش برای کندن بلوک
  try {
    await bot.dig(block)
    bot.chat(`کندن بلوک در ${block.position}`)
  } catch (err) {
    console.error("خطا در کندن بلوک:", err)
  }

  // پس از کندن، مجدداً موجودی بررسی می‌شود
  if (countWoodLogs(bot) >= 64) {
    stopCallback()
    return
  }

  // بررسی بلوک‌های همجوار در ۶ جهت
  const directions = [
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 1, 0),
    new Vec3(0, -1, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1)
  ]

  for (const dir of directions) {
    if (countWoodLogs(bot) >= 64) {
      stopCallback()
      break
    }
    const neighborPos = block.position.plus(dir)
    const neighborBlock = bot.blockAt(neighborPos)
    if (neighborBlock && neighborBlock.name.includes('log')) {
      await digLog(bot, neighborBlock, visited, stopCallback)
    }
  }
}

// تابعی برای جستجو و کندن بلوک‌های چوب تا رسیدن به 64 عدد
async function mine64Logs(bot) {
  while (countWoodLogs(bot) < 64) {
    bot.chat(`فعلا ${countWoodLogs(bot)} بلوک چوب دارم. ادامه عملیات استخراج...`)
    // جستجو برای بلوک‌های چوب در شعاع 32 بلاک
    const logs = bot.findBlocks({
      matching: block => block && block.name.includes('log'),
      maxDistance: 32,
      count: 10
    })

    if (logs.length === 0) {
      bot.chat("هیچ بلوک چوبی در نزدیکی پیدا نشد!")
      return
    }

    const startBlock = bot.blockAt(logs[0])
    let stopDigging = false
    const stopCallback = () => { stopDigging = true }
    const visited = new Set()
    await digLog(bot, startBlock, visited, stopCallback)
    // کمی وقفه قبل از جستجوی مجدد
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  bot.chat("حالا 64 بلوک چوب جمع‌آوری کردم!")
}

// راه‌اندازی ربات
createBot()

