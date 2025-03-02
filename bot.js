const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder')
const collectBlock = require('mineflayer-collectblock').plugin

const bot = mineflayer.createBot({
  host: 'localhost', // آدرس سرور
  port: 22222, // پورت سرور
  username: 'Bot' // نام کاربری ربات
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock)

bot.once('spawn', () => {
  const mcData = require('minecraft-data')(bot.version)
  const defaultMove = new Movements(bot, mcData)
  bot.pathfinder.setMovements(defaultMove)

  const logId = mcData.itemsByName.oak_log.id
  const plankId = mcData.itemsByName.oak_planks.id
  const stickId = mcData.itemsByName.stick.id
  const craftingTableId = mcData.itemsByName.crafting_table.id

  async function checkLogsAndCollect() {
    let logCount = bot.inventory.count(logId)
    if (logCount < 10) {
      const logBlocks = bot.findBlocks({
        matching: logId,
        maxDistance: 64,
        count: 10 - logCount
      })
      for (const logBlock of logBlocks) {
        await bot.collectBlock.collect(bot.blockAt(logBlock.position))
      }
    }
  }

  async function craftPlanksAndSticks() {
    const craftingTable = bot.inventory.findInventoryItem(craftingTableId)
    if (!craftingTable) {
      const plankCount = bot.inventory.count(plankId)
      if (plankCount < 5) {
        await bot.craft(mcData.recipes[bot.version].find(r => r.result.id === plankId), 1)
      }
      await bot.craft(mcData.recipes[bot.version].find(r => r.result.id === craftingTableId), 1)
    }

    const stickCount = bot.inventory.count(stickId)
    if (stickCount < 10) {
      await bot.craft(mcData.recipes[bot.version].find(r => r.result.id === stickId), 5)
    }
  }

  async function dropInventory() {
    const items = bot.inventory.items()
    for (const item of items) {
      await bot.tossStack(item)
    }
  }

  bot.on('chat', async (username, message) => {
    if (message === 'start') {
      try {
        await checkLogsAndCollect()
        await craftPlanksAndSticks()
        await dropInventory()
        bot.chat('All tasks completed and inventory dropped.')
      } catch (err) {
        bot.chat(`Error: ${err.message}`)
      }
    }
  })
})
