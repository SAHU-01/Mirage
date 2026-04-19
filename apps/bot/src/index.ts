import { Bot, Context } from "grammy";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");
const ENGINE_API_URL = process.env.ENGINE_API_URL || "http://localhost:8000";

bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome to Mirage — The Anti-Adversarial Intelligence Layer for BNB Chain.\n\n" +
    "Paste any BNB wallet address or Four.meme token address to analyze it."
  );
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  
  if (text.startsWith("0x") && text.length === 42) {
    await ctx.reply("🔍 Analyzing wallet: " + text + "...");
    
    try {
      const response = await axios.post(`${ENGINE_API_URL}/analyze_wallet?wallet_address=${text}`);
      const data = response.data;
      
      let verdictEmoji = "❓";
      if (data.verdict === "COPY") verdictEmoji = "✅";
      if (data.verdict === "AVOID") verdictEmoji = "⚠️";
      
      const message = 
        `${verdictEmoji} ${data.verdict} — Trust Score ${data.score}/100\n` +
        `${text}\n\n` +
        `• ${data.reasoning[0].substring(0, 100)}...\n` +
        `• ${data.reasoning[1].substring(0, 100)}...\n\n` +
        `[ ↘ See full reasoning ]`;
        
      await ctx.reply(message);
    } catch (error) {
      console.error(error);
      await ctx.reply("❌ Error analyzing wallet. Please try again later.");
    }
  } else {
    await ctx.reply("Please provide a valid BNB wallet address starting with 0x.");
  }
});

bot.start();
console.log("Bot is running...");
