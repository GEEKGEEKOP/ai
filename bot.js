const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalNear } = goals
const Vec3 = require('vec3') // برای مختصات سه بعدی
let mcData = null // برای نگهداری اطلاعات ماینکرافت


// تنظیمات اتصال به سرور
const bot = mineflayer.createBot({
  host: 'amiralinoroozi06.aternos.me', // آدرس سرور را اینجا وارد کنید
  port: 44300,      // پورت سرور
  username: 'WoodcutterBot' // نام ربات
})

// نصب پلاگین pathfinder
bot.loadPlugin(pathfinder)



bot.once('spawn', () => {
    mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)
    
    findAndCollectWood()
})

// لیست بلاک‌های چوب درخت
const TREE_LOGS = [
  'oak_log',
  'spruce_log',
  'birch_log',
  'jungle_log',
  'acacia_log',
  'dark_oak_log'
]

// لیست بلاک‌های برگ درخت
const TREE_LEAVES = [
  'oak_leaves',
  'spruce_leaves',
  'birch_leaves',
  'jungle_leaves',
  'acacia_leaves',
  'dark_oak_leaves'
]

let isCollecting = true // وضعیت جمع‌آوری چوب

bot.once('spawn', () => {
  const mcData = require('minecraft-data')(bot.version)
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)
  
  // شروع فرآیند جستجوی درخت
  findAndCollectWood()
})

async function findAndCollectWood() {
  while (isCollecting) {
    // بررسی تعداد چوب‌های موجود در inventory
    const logs = countLogs()
    if (logs >= 15) {
      console.log('به اندازه کافی چوب جمع شد! شروع ساخت وسایل...')
      craftWoodenItems()
      break
    }

    // پیدا کردن نزدیک‌ترین تنه درخت
    const treeLog = findNearestBlock(TREE_LOGS, 32)
    
    if (!treeLog) {
      console.log('درختی در نزدیکی پیدا نشد. در حال جستجو...')
      // حرکت تصادفی برای پیدا کردن درخت‌های جدید
      await randomMove()
      continue
    }

    // حرکت به سمت درخت
    try {
      await bot.pathfinder.goto(new GoalNear(treeLog.position.x, treeLog.position.y, treeLog.position.z, 2))
      await harvestTree(treeLog)
    } catch (err) {
      console.log('خطا در حرکت به سمت درخت:', err)
    }
  }
}

function findNearestBlock(blockTypes, maxDistance) {
  return bot.findBlock({
    matching: blockTypes.map(type => bot.registry.blocksByName[type].id),
    maxDistance: maxDistance
  })
}

async function harvestTree(treeLog) {
  // شروع از پایین درخت و حرکت به سمت بالا
  let currentPos = treeLog.position.clone()
  let foundLog = true

  while (foundLog) {
    const block = bot.blockAt(currentPos)
    if (!block || !TREE_LOGS.includes(block.name)) {
      foundLog = false
      continue
    }

    try {
      await bot.dig(block)
      currentPos.y += 1
    } catch (err) {
      console.log('خطا در کندن چوب:', err)
      break
    }
  }
}

function countLogs() {
  let count = 0
  const inventory = bot.inventory.items()
  
  for (const item of inventory) {
    if (TREE_LOGS.some(logType => item.name.includes(logType))) {
      count += item.count
    }
  }
  return count
}

async function randomMove() {
  const x = (Math.random() - 0.5) * 20
  const z = (Math.random() - 0.5) * 20
  const goal = new GoalNear(bot.entity.position.x + x, bot.entity.position.y, bot.entity.position.z + z, 2)
  await bot.pathfinder.goto(goal)
}

async function craftWoodenItems() {
  // تبدیل چوب به تخته
  await craftPlanks()
  
  // ساخت وسایل چوبی اولیه
  await craftBasicTools()
}


async function craftPlanks() {
    // اول چک می‌کنیم که آیا چوب کافی در inventory داریم
    const logs = bot.inventory.items().filter(item => TREE_LOGS.some(logType => item.name.includes(logType)))
    
    if (logs.length === 0) {
        console.log('چوب کافی برای ساخت تخته وجود ندارد!')
        return
    }

    // اول تخته چوبی می‌سازیم
    try {
        // تبدیل چوب به تخته
        await bot.craft(mcData.recipes.find(recipe => 
            recipe.result && recipe.result.name === 'oak_planks'
        ), 1) // 1 is the crafting table position (player inventory)
        
        console.log('تخته چوبی ساخته شد')

        // حالا میز کرافت می‌سازیم
        const craftingTableRecipe = mcData.recipes.find(recipe => 
            recipe.result && recipe.result.name === 'crafting_table'
        )
        
        if (!craftingTableRecipe) {
            console.log('دستور ساخت میز کرافت پیدا نشد!')
            return
        }

        await bot.craft(craftingTableRecipe, 1)
        console.log('میز کرافت ساخته شد')

        // قرار دادن میز کرافت
        const position = bot.entity.position
        position.y -= 1 // یک بلاک پایین‌تر از ربات

        await bot.equip(mcData.itemsByName.crafting_table.id, 'hand')
        await bot.placeBlock(bot.blockAt(position), new Vec3(0, 1, 0))

    } catch (err) {
        console.log('خطا در ساخت میز کرافت:', err)
    }
}

async function craftBasicTools() {
    // لیست ابزارهای چوبی که می‌خواهیم بسازیم
    const toolsToCraft = [
        'wooden_axe',
        'wooden_pickaxe',
        'wooden_shovel',
        'wooden_sword'
    ]

    for (const tool of toolsToCraft) {
        try {
            const recipe = mcData.recipes.find(r => 
                r.result && r.result.name === tool
            )
            
            if (!recipe) {
                console.log(`دستور ساخت ${tool} پیدا نشد!`)
                continue
            }

            await bot.craft(recipe, 1)
            console.log(`${tool} با موفقیت ساخته شد`)

        } catch (err) {
            console.log(`خطا در ساخت ${tool}:`, err)
        }
    }
}

// مدیریت خطاها
bot.on('error', (err) => {
  console.log('خطای ربات:', err)
})

bot.on('kicked', (reason) => {
  console.log('از سرور کیک شد:', reason)
})

bot.on('end', () => {
  console.log('اتصال قطع شد')
})
