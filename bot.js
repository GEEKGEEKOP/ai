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
      if (countLogs(bot) < 15) {
        await findAndCollectWood(bot)
      } else {
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
    const tree = await bot.findBlock({
      matching: block => block?.name.endsWith('_log'),
      maxDistance: 32,
      count: 1
    })

    if (!tree) {
      console.log('جستجوی منطقه جدید...')
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
    let currentPos = position.clone()
    for (let y = 0; y < 15; y++) {
      const block = bot.blockAt(currentPos)
      if (!block || !block.name.endsWith('_log')) break
      
      await bot.dig(block, 'force')
      currentPos.y += 1
      await sleep(1000)
    }
  } catch (err) {
    console.log('خطا در حفاری:', err.message)
  }
}

async function craftSequence(bot) {
  try {
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
  try {
    const item = mcData.itemsByName[name]
    if (!item) throw new Error('آیتم یافت نشد')
    
    const recipes = bot.recipesFor(item.id, null, 1, false)
    if (!recipes.length) throw new Error('دستور ساخت یافت نشد')
    
    await bot.craft(recipes[0], quantity)
    console.log(`ساخته شد: ${quantity}x ${name}`)
    await sleep(1000)
  } catch (err) {
    throw new Error(`خطا در ساخت ${name}: ${err.message}`)
  }
}

async function placeCraftingTable(bot) {
  try {
    const table = bot.inventory.items().find(i => i.name === 'crafting_table')
    if (!table) throw new Error('میز کاردستی در اینونتوری وجود ندارد')
    
    await bot.equip(table, 'hand')
    const pos = bot.entity.position.offset(1, 0, 0)
    await bot.placeBlock(bot.blockAt(pos), new Vec3(0, 1, 0))
    console.log('میز کاردستی قرار داده شد')
    await sleep(1000)
  } catch (err) {
    throw new Error(`خطا در قراردادن میز: ${err.message}`)
  }
}

function countLogs(bot) {
  return bot.inventory.items()
    .filter(item => item?.name.endsWith('_log'))
    .reduce((total, item) => total + item.count, 0)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

createBot()
