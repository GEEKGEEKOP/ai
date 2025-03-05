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

    version: '1.21.4', // مشخص کردن دقیق نسخه

    checkTimeoutInterval: 60000,

    defaultChatPatterns: false

  })


  // بارگذاری پلاگین قبل از هر چیز

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

      

      // مقداردهی minecraft-data با نسخه صحیح

      mcData = minecraftData(bot.version)

      

      // ایجاد حرکات پس از اطمینان از بارگذاری پلاگین

      const movements = new Movements(bot, mcData)

      movements.allowParkour = true

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
      await performSafeAction(bot)
      await sleep(1000)
    } catch (err) {
      console.log('خطا در حلقه اصلی:', err)
      await sleep(5000)
    }
  }
}

async function performSafeAction(bot) {
  if (countLogs(bot) < 15) {
    await findAndCollectWood(bot)
  } else {
    await craftSequence(bot)
  }
}

async function findAndCollectWood(bot) {
  const tree = await bot.findBlock({
    matching: block => block.name.endsWith('_log'),
    maxDistance: 32
  })

  if (!tree) {
    console.log('جستجوی منطقه جدید...')
    await safeMove(bot)
    return
  }

  console.log('یافتن درخت در موقعیت:', tree.position)
  await safeDig(bot, tree.position)
}

async function safeMove(bot) {
  try {
    const x = (Math.random() - 0.5) * 15 + bot.entity.position.x
    const z = (Math.random() - 0.5) * 15 + bot.entity.position.z
    const goal = new GoalNear(x, bot.entity.position.y, z, 1)
    
    if (bot.pathfinder.isMoving()) bot.pathfinder.stop()
    await bot.pathfinder.goto(goal)
  } catch (err) {
    console.log('خطا در حرکت:', err)
  }
}

async function safeDig(bot, position) {
  try {
    let currentPos = position.clone()
    for (let y = 0; y < 10; y++) {
      const block = bot.blockAt(currentPos)
      if (!block || !block.name.endsWith('_log')) break
      
      await bot.dig(block)
      currentPos.y += 1
      await sleep(500)
    }
  } catch (err) {
    console.log('خطا در حفاری:', err)
  }
}

async function craftSequence(bot) {
  try {
    await craftItem(bot, 'oak_planks', 4)
    await craftItem(bot, 'crafting_table', 1)
    await placeCraftingTable(bot)
    
    for (const tool of ['wooden_axe', 'wooden_pickaxe', 'wooden_shovel', 'wooden_sword']) {
      await craftItem(bot, tool, 1)
      await sleep(1000)
    }
    
    isActive = false
    console.log('>> تمام مراحل با موفقیت انجام شد!')
  } catch (err) {
    console.log('خطا در ساخت:', err)
  }
}

async function craftItem(bot, name, quantity) {
  const item = mcData.itemsByName[name]
  const recipes = bot.recipesFor(item.id, null, 1)
  
  if (!recipes.length) throw new Error('دستور ساخت یافت نشد')
  
  try {
    await bot.craft(recipes[0], quantity)
    console.log(`ساخته شد: ${quantity}x ${name}`)
    await sleep(1000)
  } catch (err) {
    throw new Error(`خطا در ساخت ${name}: ${err.message}`)
  }
}

async function placeCraftingTable(bot) {
  const table = bot.inventory.items().find(i => i.name === 'crafting_table')
  if (!table) throw new Error('میز کارافت یافت نشد')
  
  try {
    await bot.equip(table, 'hand')
    const pos = bot.entity.position.offset(1, 0, 0)
    await bot.placeBlock(bot.blockAt(pos), new Vec3(0, 1, 0))
    console.log('میز کارافت قرار داده شد')
    await sleep(1000)
  } catch (err) {
    throw new Error(`خطا در قراردادن میز: ${err.message}`)
  }
}

function countLogs(bot) {
  return bot.inventory.items()
    .filter(item => item.name.endsWith('_log'))
    .reduce((total, item) => total + item.count, 0)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// شروع برنامه
createBot()
