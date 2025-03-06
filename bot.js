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
      if (countLogs(bot) < 15) {
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
    if (!bot.inventory.items().some(i => i.name === 'oak_planks')) {
      await craftItem(bot, 'oak_planks', 1)
    }
    
    await craftItem(bot, 'crafting_table', 1)
    await placeCraftingTable(bot)
    
    const tools = [
      'wooden_axe',
      'wooden_pickaxe',
      'wooden_shovel',
      'wooden_sword'
    ]
    
    for (const tool of tools) {
      await craftItem(bot, tool, 1)
      await sleep(2000)
    }
    
    isActive = false
    console.log('>> تمام مراحل با موفقیت انجام شد!')
  } catch (err) {
    console.log('خطا در فرآیند ساخت:', err.message)
  }
}

async function craftItem(bot, name, quantity) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`در حال ساخت ${name}...`)
      const item = mcData.itemsByName[name]
      if (!item) throw new Error('آیتم یافت نشد')
      
      const recipes = bot.recipesFor(item.id, null, 1, false)
      if (!recipes.length) throw new Error('دستور ساخت یافت نشد')
      
      bot.once('craft', (recipe) => {
        console.log(`ساخته شد: ${quantity}x ${name}`)
        resolve()
      })

      bot.craft(recipes[0], quantity, null, (err) => {
        if (err) {
          console.log(`خطا در ساخت ${name}: ${err.message}`)
          reject(`خطا در ساخت ${name}: ${err.message}`)
        }
      })

      // Add a timeout to ensure the crafting process doesn't hang
      setTimeout(() => {
        reject(`ساخت ${name} به تایم‌اوت رسید`)
      }, 20000)
    } catch (err) {
      reject(`خطا در ساخت ${name}: ${err.message}`)
    }
  })
}

async function placeCraftingTable(bot) {
  try {
    console.log('در حال قرار دادن میز کاردستی...')
    const table = bot.inventory.items().find(i => i.name === 'crafting_table')
    if (!table) throw new Error('میز کاردستی در اینونتوری وجود ندارد')
    
    await bot.equip(table, 'hand')
    const pos = bot.entity.position.offset(1, 0, 0)
    const referenceBlock = bot.blockAt(pos)
    if (!referenceBlock) throw new Error('بلاک مرجع برای قرار دادن میز کاردستی پیدا نشد')
    
    await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0))
    console.log('میز کاردستی قرار داده شد')
    await sleep(1000)

    // اطمینان از استفاده از میز کاردستی
    const craftingTable = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 6
    })
    if (!craftingTable) throw new Error('میز کاردستی پیدا نشد')
    const craftingTableWindow = await bot.openBlock(craftingTable)
    console.log('میز کاردستی باز شد')
    await sleep(1000)
    craftingTableWindow.close()
  } catch (err) {
    throw new Error(`خطا در قراردادن میز: ${err.message}`)
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

createBot()
