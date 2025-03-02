const mineflayer = require('mineflayer')
const Vec3 = require('vec3').Vec3

// تنظیمات اولیه بات
const bot = mineflayer.createBot({
    host: 'localhost', // سرور لوکال یا آدرس سرورت رو بذار
    port: 22222,       // پورت سرور
    username: 'Amirali' // اسم بات
})

// وقتی بات وارد سرور شد
bot.once('spawn', () => {
    console.log('بات وارد شد! شروع ماموریت...')
    checkInventoryAndStart()
})

// تابع اصلی برای چک کردن اینونتوری و شروع کار
async function checkInventoryAndStart() {
    try {
        const logCount = countLogsInInventory()
        console.log(`تعداد log داخل اینونتوری: ${logCount}`)

        if (logCount < 10) {
            console.log('log کافی نیست! می‌رم جمع کنم...')
            await gatherLogs(10 - logCount)
        }

        console.log('log‌ها جمع شدن! حالا تبدیل به plank...')
        await convertLogsToPlanks()
        await craftSticks()
        await craftCraftingTable()
        await craftBasicTools()
        await dropAllItems()

        console.log('ماموریت تموم شد!')
    } catch (error) {
        console.error('یه مشکلی پیش اومد:', error)
    }
}

// تابع شمارش log‌ها تو اینونتوری
function countLogsInInventory() {
    const logs = bot.inventory.items().filter(item => 
        item.name.includes('log')
    )
    return logs.reduce((total, log) => total + log.count, 0)
}

// جمع‌آوری log از درخت‌ها
async function gatherLogs(amountNeeded) {
    while (countLogsInInventory() < 10) {
        const treeBlock = bot.findBlock({
            matching: block => block.name.includes('log'),
            maxDistance: 32
        })

        if (!treeBlock) {
            console.log('درختی پیدا نکردم! می‌گردم...')
            await exploreArea()
            continue
        }

        await bot.pathfinder.goto(new Vec3(treeBlock.position))
        await bot.dig(treeBlock)
        await sleep(500) // یه کم صبر برای جمع شدن آیتم‌ها
    }
}

// گشتن تو محیط اگه درخت پیدا نشد
async function exploreArea() {
    const randomX = bot.entity.position.x + (Math.random() * 20 - 10)
    const randomZ = bot.entity.position.z + (Math.random() * 20 - 10)
    const y = bot.entity.position.y

    await bot.pathfinder.goto(new Vec3(randomX, y, randomZ))
}

// تبدیل log به plank
async function convertLogsToPlanks() {
    const logItem = bot.inventory.items().find(item => item.name.includes('log'))
    if (!logItem) return

    await bot.craft(bot.registry.itemsByName['planks'].id, 10, null)
    console.log('10 تا plank درست شد!')
}

// ساخت 10 تا stick
async function craftSticks() {
    const plankItem = bot.inventory.items().find(item => item.name.includes('planks'))
    if (!plankItem || plankItem.count < 4) {
        console.log('plank کافی نیست برای stick!')
        return
    }

    await bot.craft(bot.registry.itemsByName['stick'].id, 10, null)
    console.log('10 تا stick درست شد!')
}

// ساخت crafting table
async function craftCraftingTable() {
    const plankItem = bot.inventory.items().find(item => item.name.includes('planks'))
    if (!plankItem || plankItem.count < 4) {
        console.log('plank کافی نیست برای crafting table!')
        return
    }

    await bot.craft(bot.registry.itemsByName['crafting_table'].id, 1, null)
    console.log('crafting table درست شد!')
    await placeCraftingTable()
}

// گذاشتن crafting table تو محیط
async function placeCraftingTable() {
    const tableItem = bot.inventory.items().find(item => item.name === 'crafting_table')
    if (!tableItem) return

    const position = bot.entity.position.offset(1, 0, 0)
    await bot.equip(tableItem, 'hand')
    await bot.placeBlock(bot.blockAt(position.offset(0, -1, 0)), new Vec3(0, 1, 0))
    console.log('crafting table قرار داده شد!')
}

// ساخت ابزارهای اولیه چوبی
async function craftBasicTools() {
    const stickItem = bot.inventory.items().find(item => item.name === 'stick')
    const plankItem = bot.inventory.items().find(item => item.name.includes('planks'))
    
    if (!stickItem || !plankItem) return

    const tools = ['wooden_pickaxe', 'wooden_axe']
    for (const tool of tools) {
        await bot.craft(bot.registry.itemsByName[tool].id, 1, bot.nearestEntity(e => e.name === 'crafting_table'))
        console.log(`${tool} درست شد!`)
    }
}

// دراپ کردن همه آیتم‌های اینونتوری
async function dropAllItems() {
    const items = bot.inventory.items()
    for (const item of items) {
        await bot.tossStack(item)
    }
    console.log('همه آیتم‌ها دراپ شدن!')
}

// تابع کمکی برای صبر کردن
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// مدیریت خطاها
bot.on('error', (err) => console.log('یه خطا پیش اومد:', err))
bot.on('kicked', (reason) => console.log('کیک شدم:', reason))
