const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const collectBlock = require('mineflayer-collectblock').plugin;
const { GoalNear } = require('mineflayer-pathfinder').goals;

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 22222,
  username: 'Bot'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(collectBlock);

async function startProcess() {
  try {
    await checkAndCollectLogs();
    await convertLogsToPlanks();
    await craftSticks(10);
    await craftCraftingTable();
    await dropAllItems();
    console.log('✅ تمام مراحل با موفقیت انجام شد!');
  } catch (err) {
    console.error('❌ خطا:', err);
  }
}

async function checkAndCollectLogs() {
  const logs = countItems('log');
  if (logs >= 10) {
    console.log('📦 تعداد کافی لاگ موجود است');
    return;
  }
  
  console.log('🌳 در حال جمع‌آوری لاگ...');
  const needed = 10 - logs;
  await collectLogs(needed);
}

function countItems(name) {
  return bot.inventory.items()
    .filter(item => item.name.includes(name))
    .reduce((acc, item) => acc + item.count, 0);
}

async function collectLogs(needed) {
  const logs = bot.registry.blocksArray.filter(b => b.name.endsWith('_log'));
  return new Promise((resolve, reject) => {
    bot.collectBlock.collect({ blocks: logs.map(l => l.id) }, needed, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function convertLogsToPlanks() {
  const logs = bot.inventory.items().filter(item => item.name.endsWith('_log'));
  
  for (const log of logs) {
    const plankType = log.name.replace('_log', '_planks');
    const recipe = bot.recipesFor(bot.mcData.itemsByName[plankType].id, null, 1)[0];
    
    if (recipe) {
      console.log(`🪵 تبدیل ${log.name} به پلنک...`);
      await bot.craft(recipe, 1, null);
    }
  }
}

async function craftSticks(amount) {
  console.log('🪵 در حال ساخت چوب...');
  const needed = Math.ceil(amount / 4);
  
  for (let i = 0; i < needed; i++) {
    const recipe = bot.recipesFor(bot.mcData.itemsByName['stick'].id, null, 1)
      .find(r => r.delta.some(d => d.name.includes('planks')));
    
    if (recipe) await bot.craft(recipe, 1, null);
  }
}

async function craftCraftingTable() {
  console.log('🛠️ در حال ساخت کاردستی...');
  const recipe = bot.recipesFor(bot.mcData.itemsByName['crafting_table'].id, null, 1)[0];
  if (recipe) await bot.craft(recipe, 1, null);
}

async function dropAllItems() {
  console.log('🗑️ در حال دور ریختن همه آیتم‌ها...');
  for (const item of bot.inventory.items()) {
    await bot.toss(item.type, item.metadata, item.count);
  }
}

bot.once('spawn', startProcess);

// هندل کردن خطاها
bot.on('error', err => console.error('❌ خطای اصلی:', err));
bot.on('end', () => console.log('🔌 اتصال قطع شد'));
