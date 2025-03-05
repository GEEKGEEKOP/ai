const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalNear } = goals
const Vec3 = require('vec3')
let mcData = null
let reconnectAttempts = 0
let isCollecting = true

const bot = mineflayer.createBot({
  host: 'amiralinoroozi06.aternos.me',
  port: 44300,
  username: 'Bot',
  auth: 'offline',
  checkTimeoutInterval: 30000,
  defaultChatPatterns: false
})

bot.loadPlugin(pathfinder)

bot.on('error', (err) => {
  console.log(`خطا: ${err.message}`)
  bot.end()
})

bot.on('end', (reason) => {
  console.log(`اتصال قطع شد: ${reason}`)
  if (reconnectAttempts < 5) {
    setTimeout(() => {
      console.log(`تلاش مجدد #${++reconnectAttempts}`)
      createBot()
    }, 30000)
  } else {
    console.log('تعداد تلاش‌ها به حداکثر رسید!')
  }
})

bot.once('spawn', () => {
  console.log('>> ربات با موفقیت وارد جهان شد!')
  reconnectAttempts = 0
  mcData = require('minecraft-data')(bot.version)
  const movements = new Movements(bot, mcData)
  movements.allowParkour = true
  bot.pathfinder.setMovements(movements)
  startCollecting()
})

async function startCollecting() {
  while (isCollecting) {
    try {
      if (countLogs() >= 15) {
        console.log('به اندازه کافی چوب جمع شد!')
        await craftWoodenItems()
        isCollecting = false
        break
      }

      const tree = bot.findBlock({
        matching: block => block.name.endsWith('_log'),
        maxDistance: 32
      })

      if (!tree) {
        console.log('درختی یافت نشد. جستجوی مجدد...')
        await randomMove()
        continue
      }

      if (bot.pathfinder.isMoving()) bot.pathfinder.stop()
      await bot.pathfinder.goto(new GoalNear(tree.position.x, tree.position.y, tree.position.z, 2))
      await harvestTree(tree.position)
    } catch (err) {
      console.log('خطا:', err.message)
      await sleep(5000)
    }
  }
}

async function harvestTree(pos) {
  let currentPos = pos.clone()
  while (true) {
    const block = bot.blockAt(currentPos)
    if (!block || !block.name.endsWith('_log')) break
    try {
      await bot.dig(block)
      currentPos.y += 1
    } catch (err) {
      console.log('خطا در کندن:', err.message)
      break
    }
  }
}

async function craftWoodenItems() {
  try {
    await craftItem('oak_planks', 4)
    await craftItem('crafting_table', 1)
    await placeCraftingTable()
    for (const tool of ['wooden_axe', 'wooden_pickaxe', 'wooden_shovel', 'wooden_sword']) {
      await craftItem(tool, 1)
    }
  } catch (err) {
    console.log('خطا در ساخت:', err.message)
  }
}

async function craftItem(name, quantity) {
  const item = mcData.itemsByName[name]
  const recipes = bot.recipesFor(item.id, null, 1)
  if (!recipes.length) throw new Error('دستور ساخت یافت نشد')
  await bot.craft(recipes[0], quantity)
  console.log(`ساخته شد: ${name}`)
}

async function placeCraftingTable() {
  const table = bot.inventory.items().find(i => i.name === 'crafting_table')
  if (!table) throw new Error('میز کرافت یافت نشد')
  await bot.equip(table, 'hand')
  const pos = bot.entity.position.offset(1, 0, 0)
  await bot.placeBlock(bot.blockAt(pos), new Vec3(0, 1, 0))
}

function countLogs() {
  return bot.inventory.items()
    .filter(item => item.name.endsWith('_log'))
    .reduce((total, item) => total + item.count, 0)
}

async function randomMove() {
  const x = (Math.random() - 0.5) * 20
  const z = (Math.random() - 0.5) * 20
  const goal = new GoalNear(bot.entity.position.x + x, bot.entity.position.y, bot.entity.position.z + z, 2)
  await bot.pathfinder.goto(goal)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ایجاد نمونه اولیه
function createBot() {
  return mineflayer.createBot({
    host: 'amiralinoroozi06.aternos.me',
    port: 44300,
    username: 'Bot',
    auth: 'offline',
    checkTimeoutInterval: 30000,
    defaultChatPatterns: false
  })
}
