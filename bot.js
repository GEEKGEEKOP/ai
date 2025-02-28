const mineflayer = require('mineflayer');

// تنظیمات ربات
const bot = mineflayer.createBot({
    host: 'localhost', // آدرس سرور (برای لوکال همینو بذار)
    port: 25565,      // پورت سرور (پیش‌فرض ماینکرفته)
    username: 'TreeBot',
    version: '1.21' // اسم ربات
});

// وقتی ربات وارد بازی شد
bot.on('spawn', () => {
    console.log('ربات وارد شد!');
    findAndChopTree(); // بره درخت پیدا کنه و بزنه
});

// پیدا کردن و زدن درخت
function findAndChopTree() {
    const tree = bot.findBlock({
        matching: block => block.name.includes('log'), // دنبال چوب بگرده
        maxDistance: 32 // حداکثر فاصله جستجو
    });

    if (tree) {
        bot.chat('درخت پیدا کردم!');
        bot.pathfinder.goto(new bot.goals.GoalNear(tree.position.x, tree.position.y, tree.position.z, 2))
            .then(() => {
                bot.dig(tree); // درخت رو بزنه
            })
            .catch(err => console.log('خطا:', err));
    } else {
        bot.chat('درختی پیدا نکردم!');
    }
}

// وقتی چت کنن باهاش
bot.on('chat', (username, message) => {
    if (message === 'chop') {
        findAndChopTree(); // دستور برای زدن درخت
    }
});
