const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalNear } = goals
const Vec3 = require('vec3')
const minecraftData = require('minecraft-data')

let mcData = null
let reconnectAttempts = 0
let isActive = true

function createBot() {
  const bot = mineflayer.createBot({
    host: 'amiralinoroozi06.aternos.me',
    port: 44300,
    username: 'Bot',
    auth: 'offline',
    version: '1.21.4',
    checkTimeoutInterval: 60000,
    defaultChatPatterns: false
  })

  bot.loadPlugin(pathfinder)

  bot.on('error', async (err) => {
    console.log(`خطای اتصال: ${err.message}`)
    await sleep(5000)
    bot.end()
  })

  bot.on('end', async (reason) => {
    console.log(`اتصال قطع شد: ${reason}`)
    if (reconnectAttempts < 3) {
      await sleep(10000)
      console.log(`تلاش مجدد #${++reconnectAttempts}`)
      createBot()
    }
  })

  bot.once('spawn', async () => {
    try {
      console.log('>> اتصال موفقیت‌آمیز!')
      reconnectAttempts = 0
      mcData = minecraftData(bot.version)
      
      const movements = new Movements(bot, mcData)
      movements.allowSprinting = true
      movements.allow1by1towers = true
      bot.pathfinder.setMovements(movements)
      
      await sleep(3000)
      mainLoop(bot)
    } catch (err) {
      console.log('خطا در راه‌اندازی:', err)
    }
  })

  return bot
}

async function mainLoop(bot) {
  while (isActive) {
    try {
      console.log('شروع حلقه اصلی...')
      const logCount = countLogs(bot)
      const plankCount = countPlanks(bot)
      
      if (logCount < 15 && plankCount < 4) {
        console.log('تعداد چوب کمتر از 15 است. جستجو و جمع‌آوری چوب...')
        await findAndCollectWood(bot)
      } else {
        console.log('تعداد چوب کافی است. شروع فرآیند ساخت...')
        await craftSequence(bot)
      }
      await sleep(1000)
    } catch (err) {
      console.log('خطا در حلقه اصلی:', err.message)
      await sleep(5000)
    }
  }
}

async function findAndCollectWood(bot) {
  try {
    console.log('جستجوی درخت...')
    const tree = await bot.findBlock({
      matching: block => block?.name.endsWith('_log'),
      maxDistance: 32,
      count: 1
    })

    if (!tree) {
      console.log('درختی پیدا نشد. جستجوی منطقه جدید...')
      await safeMove(bot)
      return
    }

    console.log('یافتن درخت در موقعیت:', tree.position)
    await moveToTarget(bot, tree.position)
    await harvestTree(bot, tree.position)
  } catch (err) {
    console.log('خطا در جمع‌آوری چوب:', err.message)
  }
}

async function moveToTarget(bot, position) {
  try {
    if (bot.pathfinder.isMoving()) bot.pathfinder.stop()
    
    const goal = new GoalNear(
      position.x,
      position.y,
      position.z,
      1
    )
    
    await bot.pathfinder.goto(goal)
    console.log('رسیدن به هدف')
  } catch (err) {
    console.log('خطا در حرکت:', err.message)
  }
}

async function harvestTree(bot, position) {
  try {
    console.log('شروع حفاری درخت...')
    let currentPos = position.clone()
    for (let y = 0; y < 15; y++) {
      const block = bot.blockAt(currentPos)
      if (!block || !block.name.endsWith('_log')) break
      
      await bot.dig(block, 'force')
      console.log('حفاری:', block.name, 'در', currentPos)
      currentPos.y += 1
      await sleep(1000)
    }
  } catch (err) {
    console.log('خطا در حفاری:', err.message)
  }
}

async function craftSequence(bot) {
  try {
    console.log('شروع فرآیند ساخت...')
    
    // Check and craft planks if needed
    if (countPlanks(bot) < 4) {
      console.log('نیاز به ساخت تخته...')
      await craftPlanks(bot)
      await sleep(1000)
    }

    // Check and craft crafting table if needed
    if (!hasCraftingTable(bot)) {
      console.log('نیاز به ساخت میز کرافت...')
      await craftCraftingTable(bot)
      await sleep(1000)
    }

    // Place crafting table if not already placed
    const nearbyTable = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 4
    })
    
    if (!nearbyTable) {
      await placeCraftingTable(bot)
      await sleep(1000)
    }

    // Craft wooden tools
    const tools = ['wooden_axe', 'wooden_pickaxe', 'wooden_shovel', 'wooden_sword']
    for (const tool of tools) {
      if (!hasItem(bot, tool)) {
        await craftTool(bot, tool)
        await sleep(1000)
      }
    }

    isActive = false
    console.log('>> تمام مراحل با موفقیت انجام شد!')
  } catch (err) {
    console.log('خطا در فرآیند ساخت:', err.message)
    throw err
  }
}

async function craftPlanks(bot) {
  return new Promise(async (resolve, reject) => {
    try {
      const startPlanks = countPlanks(bot)
      console.log('تعداد تخته قبل از ساخت:', startPlanks)

      const plankRecipe = bot.recipesFor(mcData.itemsByName.oak_planks.id)[0]
      if (!plankRecipe) {
        throw new Error('دستور ساخت تخته یافت نشد')
      }

      console.log('شروع ساخت تخته...')
      await bot.craft(plankRecipe, 1, null)
      await sleep(1000)

      const endPlanks = countPlanks(bot)
      console.log('تعداد تخته بعد از ساخت:', endPlanks)

      if (endPlanks > startPlanks) {
        console.log('تخته با موفقیت ساخته شد')
        resolve()
      } else {
        reject(new Error('خطا در ساخت تخته'))
      }
    } catch (err) {
      reject(err)
    }
  })
}

async function craftCraftingTable(bot) {
  return new Promise(async (resolve, reject) => {
    try {
      if (hasCraftingTable(bot)) {
        resolve()
        return
      }

      const recipe = bot.recipesFor(mcData.itemsByName.crafting_table.id)[0]
      if (!recipe) {
        throw new Error('دستور ساخت میز کرافت یافت نشد')
      }

      console.log('شروع ساخت میز کرافت...')
      await bot.craft(recipe, 1, null)
      await sleep(1000)

      if (hasCraftingTable(bot)) {
        console.log('میز کرافت با موفقیت ساخته شد')
        resolve()
      } else {
        reject(new Error('خطا در ساخت میز کرافت'))
      }
    } catch (err) {
      reject(err)
    }
  })
}

async function craftTool(bot, toolName) {
  let window = null
  try {
    if (hasItem(bot, toolName)) {
      return
    }

    // Find crafting table
    const craftingTable = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 4
    })

    if (!craftingTable) {
      throw new Error('میز کرافت در نزدیکی یافت نشد')
    }

    // Ensure we have enough planks
    const planksNeeded = toolName === 'wooden_sword' ? 2 : 3
    if (countPlanks(bot) < planksNeeded) {
      await craftPlanks(bot)
    }

    // Open crafting table
    window = await bot.openBlock(craftingTable)
    console.log('میز کرافت باز شد')

    // Get all recipes and find the matching one
    const recipes = bot.recipesAll()
    const recipe = recipes.find(r => r.result && r.result.name === toolName)

    if (!recipe) {
      throw new Error(`دستور ساخت ${toolName} یافت نشد`)
    }

    // Craft the tool
    console.log(`شروع ساخت ${toolName}...`)
    await bot.craft(recipe, 1, craftingTable)
    await sleep(500)

    if (hasItem(bot, toolName)) {
      console.log(`${toolName} با موفقیت ساخته شد`)
    } else {
      throw new Error(`خطا در ساخت ${toolName}`)
    }
  } catch (err) {
    console.log(`خطا در ساخت ${toolName}:`, err.message)
    throw err
  } finally {
    if (window) {
      window.close()
    }
  }
}

async function placeCraftingTable(bot) {
  try {
    console.log('تلاش برای قرار دادن میز کرافت...')
    
    const craftingTable = bot.inventory.items().find(item => item.name === 'crafting_table')
    if (!craftingTable) {
      throw new Error('میز کرافت در کوله‌پشتی یافت نشد')
    }

    await bot.equip(craftingTable, 'hand')
    await sleep(500)

    // Find a suitable place to put the crafting table
    const pos = bot.entity.position.offset(1, -1, 0)
    const block = bot.blockAt(pos)
    
    if (!block || block.name === 'air') {
      throw new Error('مکان مناسب برای قرار دادن میز کرافت یافت نشد')
    }

    await bot.placeBlock(block, new Vec3(0, 1, 0))
    console.log('میز کرافت با موفقیت قرار داده شد')
    await sleep(500)

  } catch (err) {
    console.log('خطا در قرار دادن میز کرافت:', err.message)
    throw err
  }
}

async function safeMove(bot) {
  try {
    console.log('حرکت به منطقه جدید...')
    const x = bot.entity.position.x + (Math.random() - 0.5) * 100
    const z = bot.entity.position.z + (Math.random() - 0.5) * 100
    const goal = new GoalNear(x, bot.entity.position.y, z, 1)
    await bot.pathfinder.goto(goal)
    console.log('رسیدن به منطقه جدید')
  } catch (err) {
    console.log('خطا در حرکت به منطقه جدید:', err.message)
  }
}

function countLogs(bot) {
  const logCount = bot.inventory.items()
    .filter(item => item?.name.endsWith('_log'))
    .reduce((total, item) => total + item.count, 0)
  console.log(`تعداد چوب: ${logCount}`)
  return logCount
}

function countPlanks(bot) {
  return bot.inventory.items()
    .filter(item => item?.name === 'oak_planks')
    .reduce((total, item) => total + item.count, 0)
}

function hasCraftingTable(bot) {
  return bot.inventory.items().some(item => item.name === 'crafting_table')
}

function hasItem(bot, itemName) {
  return bot.inventory.items().some(item => item.name === itemName)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

createBot()
