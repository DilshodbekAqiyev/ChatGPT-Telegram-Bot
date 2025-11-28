require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fetch = require("node-fetch");

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

    // 1. Telegramdan ovoz faylini olish
    const fileId = msg.voice.file_id;
    const fileUrl = await bot.getFileLink(fileId);

    // 2. Ovoz faylini buffer sifatida yuklab olish (LOCAL YO‘Q!)
    const res = await fetch(fileUrl);
    const audioBuffer = await res.buffer();

    // 3. Ovoz → matn (transcript)
    const transcriptResult = await model.generateContent([
      {
        inlineData: {
          data: audioBuffer.toString("base64"),
          mimeType: "audio/ogg",
        },
      },
      "Bu ovozni matnga aylantir.",
    ]);

    const transcript = transcriptResult.response.text();

    // 4. Olingan matnni yuborish
    await bot.sendMessage(chatId, `🔊 Ovoz matni:\n${transcript}`);

    // 5. Matnni Gemini AI ga yuborish
    const aiResult = await model.generateContent(transcript);
    const aiReply = aiResult.response.text();

    // 6. Gemini javobi
    await bot.sendMessage(chatId, `🤖 AI javobi:\n${aiReply}`);

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
