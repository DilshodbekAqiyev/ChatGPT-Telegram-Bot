require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// /start komandasi
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Salom! Men ChatGPT AI botman. Savolingizni yozing 👇"
  );
});

// /help komandasi
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText =
    "🤖 *ChatGPT Telegram Bot yordamchi*\n\n" +
    "Quyidagilarni qilishingiz mumkin:\n" +
    "• Har qanday savol so‘rash va javob olish\n" +
    "• Matn yozish, tarjima, maslahat olish\n" +
    "\nBuyruqlar:\n" +
    "/start - Botni ishga tushirish\n" +
    "/help - Botdan foydalanish bo‘yicha ma’lumot\n\n\n" +
    "Yaratuvchi: t.me/dilshodbekaqiyev";

  bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});

// Barcha xabarlar
bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (text.startsWith("/start") || text.startsWith("/help")) return;

  try {
    bot.sendChatAction(chatId, "typing");

    const result = await model.generateContent(text);
    let reply = result.response.text();

    reply = reply.replace(/[*_~`<>]/g, "");

    bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Xatolik yuz berdi, keyinroq urinib ko‘ring.");
  }
});
