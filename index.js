require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

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
    "• Savol berish\n" +
    "• Tarjima\n" +
    "• Maslahat olish\n" +
    "• Ovozli habarni matnga aylantirish 🎤\n" +
    "\nBuyruqlar:\n" +
    "/start - Botni ishga tushirish\n" +
    "/help - Yordam";

  bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});


bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;

  try {
    bot.sendChatAction(chatId, "typing");

    const fileId = msg.voice.file_id;
    const fileUrl = await bot.getFileLink(fileId);

    // 1. Voice-ni yuklab olish
    const res = await fetch(fileUrl);
    const buffer = await res.buffer();

    const filePath = path.join(process.cwd(), "voice.ogg");
    fs.writeFileSync(filePath, buffer);

    // 2. Ovoz → matn (transcript)
    const audioBytes = fs.readFileSync(filePath);

    const result = await model.generateContent([
      {
        inlineData: {
          data: audioBytes.toString("base64"),
          mimeType: "audio/ogg",
        },
      },
      "Bu ovozni matnga aylantir.",
    ]);

    const transcript = result.response.text();

    // ✔ 3. Olingan matnni foydalanuvchiga yuborish
    bot.sendMessage(chatId, `🔊 Ovozdan olingan matn:\n${transcript}`);
    bot.sendChatAction(chatId, "typing");

    // ✔ 4. Matnni Gemini ga yuborish (javob olish)
    const aiResponse = await model.generateContent(transcript);
    const reply = aiResponse.response.text();

    // ✔ 5. Gemini javobini foydalanuvchiga yuborish
    bot.sendMessage(chatId, `🤖 AI javobi:\n${reply}`);

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Ovozli xabarni o‘qishda xatolik!");
  }
});



// 📌 Matnli xabarlarni qayta ishlash
bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (!text || text.startsWith("/start") || text.startsWith("/help")) return;

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
