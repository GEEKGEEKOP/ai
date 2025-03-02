const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const Vec3 = require('vec3')

// ایجاد بات با مشخصات لازم (هاست، پورت، نام کاربری)
const bot = mineflayer.createBot({
  host: 'localhost',   // آدرس سرور (در صورت نیاز تغییر دهید)
    port: 22222,         // پورت سرور
  username: 'Bot'      // نام کاربری بات
})

// بارگذاری پلاگین pathfinder جهت حرکت در محیط
bot.loadPlugin(pathfinder)

// زمانی که بات وارد بازی شد، وظایف اصلی اجرا می‌شوند
bot.once('spawn', () => {
  bot.chat("بات وارد بازی شد!")
  runBotTasks()
})

// تابع شمارش آیتم‌ها در اینونتری بر اساس نام آیتم
function countItem(itemName) {
  return bot.inventory.items().reduce((sum, item) => {
    if (item.name === itemName) {
      return sum + item.count
    }
    return sum
  }, 0)
}

// تابع جمع‌آوری log (oak_log) تا زمانی که تعداد مورد نظر (targetCount) به دست آید
async function gatherLogs(targetCount) {
  bot.chat("شروع جمع‌آوری logها.")
  while (countItem('oak_log') < targetCount) {
    const logBlock = bot.findBlock({
      matching: block => block.name === 'oak_log',
      maxDistance: 64
    })
    if (!logBlock) {
      bot.chat("هیچ log مناسبی پیدا نشد، کمی صبر کنید...")
      await new Promise(resolve => setTimeout(resolve, 5000))
      continue
    }
    try {
      await bot.dig(logBlock)
      bot.chat("یک log جمع‌آوری شد.")
    } catch (err) {
      bot.chat("خطا در کندن log: " + err.message)
    }
  }
  bot.chat("تعداد لازم logها جمع‌آوری شد.")
}

// تابع ساخت آیتم‌ها با استفاده از recipes موجود
async function craftItem(itemName, count, craftingTable = null) {
  // اطمینان از بارگذاری کامل recipeها
  await bot.waitForTicks(1)
  const recipes = bot.recipesAll(itemName, null, craftingTable)
  if (recipes.length === 0) {
    bot.chat(`راهنمای ساخت برای ${itemName} پیدا نشد.`)
    return false
  }
  const recipe = recipes[0]
  try {
    await bot.craft(recipe, count, craftingTable)
    bot.chat(`ساخت ${count} عدد ${itemName} انجام شد.`)
    return true
  } catch (err) {
    bot.chat(`خطا در ساخت ${itemName}: ${err.message}`)
    return false
  }
}

// تابع انداختن (drop) تمام آیتم‌های موجود در اینونتری
function dropAllItems() {
  const items = bot.inventory.items()
  for (const item of items) {
    try {
      bot.tossStack(item)
    } catch (err) {
      bot.chat(`خطا در انداختن ${item.name}: ${err.message}`)
    }
  }
  bot.chat("تمام آیتم‌های اینونتری انداخته شدند.")
}

// تابع اصلی اجرای وظایف
async function runBotTasks() {
  // بررسی تعداد log موجود در اینونتری؛ اگر کمتر از 10 باشد، اقدام به جمع‌آوری می‌کند.
  if (countItem('oak_log') < 10) {
    await gatherLogs(10)
  }
  
  // تبدیل logها به plank (oak_planks)
  // فرض بر این است که هر log به صورت خودکار به plank تبدیل می‌شود.
  const logsCount = countItem('oak_log')
  if (logsCount > 0) {
    // برای هر log یک بار ساخت plank انجام می‌شود.
    for (let i = 0; i < logsCount; i++) {
      await craftItem('oak_planks', 1) // هر فراخوانی یک log به plank تبدیل می‌کند.
    }
  }
  
  // ساخت stick: دستور ساخت stick از دو plank است که ۴ stick تولید می‌کند.
  // به منظور دریافت بیش از 10 عدد، سه بار ساخت انجام می‌شود.
  await craftItem('stick', 3)
  
  // ساخت یک crafting table از oak_planks (معمولاً ۴ plank برای یک crafting table نیاز است)
  await craftItem('crafting_table', 1)
  
  // انداختن تمام آیتم‌های موجود در اینونتری جهت بررسی
  dropAllItems()
}

