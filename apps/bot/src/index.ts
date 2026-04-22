import { Bot, InlineKeyboard } from "grammy";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ENGINE_API_URL = process.env.ENGINE_API_URL || "http://localhost:8000";

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const bot = new Bot(BOT_TOKEN);

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

type AgentTrace = {
  agent: string;
  score: number;
  findings: string[];
  citations: Array<{
    claim: string;
    block_number: number | null;
    tx_hash: string | null;
    wallet_address: string | null;
  }>;
};

type WalletVerdict = {
  wallet_address: string;
  verdict: "COPY" | "AVOID" | "UNCERTAIN";
  trust_score: number;
  counter_argument: string;
  reasoning_trace: AgentTrace[];
};

type RankedBuyer = {
  wallet_address: string;
  trust_score: number;
  verdict: string;
};

type TokenVerdict = {
  token_address: string;
  verdict: "COPY" | "AVOID" | "UNCERTAIN";
  trust_score: number;
  bundle_contamination_pct: number;
  graduation_probability: number;
  ranked_buyers: RankedBuyer[];
  counter_argument: string;
};

function verdictEmoji(verdict: string): string {
  if (verdict === "COPY") return "✅";
  if (verdict === "AVOID") return "⚠️";
  return "❓";
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatWalletCard(v: WalletVerdict): string {
  const top = v.reasoning_trace
    .flatMap((t) => t.findings.slice(0, 1))
    .slice(0, 3)
    .map((f) => `• ${f}`)
    .join("\n");

  return (
    `${verdictEmoji(v.verdict)} *${v.verdict}* — Trust Score ${v.trust_score}/100\n` +
    `\`${v.wallet_address}\`\n\n` +
    (top || "• No findings surfaced by agents.") +
    `\n\n_Tap a button below for the full chain of thought._`
  );
}

function formatTokenCard(v: TokenVerdict): string {
  const buyers = v.ranked_buyers
    .slice(0, 5)
    .map(
      (b) =>
        `${verdictEmoji(b.verdict)} ${shortAddr(b.wallet_address)} — ${b.trust_score}/100`,
    )
    .join("\n");

  return (
    `${verdictEmoji(v.verdict)} *${v.verdict}* — Trust Score ${v.trust_score}/100\n` +
    `Token: \`${v.token_address}\`\n\n` +
    `• Bundle contamination: *${v.bundle_contamination_pct.toFixed(1)}%*\n` +
    `• Graduation probability: *${(v.graduation_probability * 100).toFixed(0)}%*\n\n` +
    `*Top ranked early buyers:*\n${buyers || "_none found_"}`
  );
}

function walletKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("↘ Full reasoning", "reasoning")
    .text("⊘ Counter-argument", "counter")
    .row()
    .text("🔔 Subscribe", "subscribe")
    .text("🔗 Share", "share");
}

const lastWalletByChat = new Map<number, WalletVerdict>();
const lastTokenByChat = new Map<number, TokenVerdict>();

bot.command("start", (ctx) =>
  ctx.reply(
    "*Welcome to Mirage* — the anti-adversarial intelligence layer for BNB Chain.\n\n" +
      "Paste any BNB wallet or Four.meme token address and I'll tell you if it's smart money — or cheating.",
    { parse_mode: "Markdown" },
  ),
);

bot.command("analyze", async (ctx) => {
  const arg = ctx.match?.trim();
  if (!arg) {
    await ctx.reply("Usage: /analyze <wallet_or_token_address>");
    return;
  }
  await handleAddress(ctx, arg);
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (ADDRESS_RE.test(text)) {
    await handleAddress(ctx, text);
  } else {
    await ctx.reply("Please paste a valid 0x… BNB address (40 hex chars).");
  }
});

async function handleAddress(ctx: Parameters<Parameters<typeof bot.on>[1]>[0], address: string) {
  const status = await ctx.reply(`🔍 Analyzing \`${address}\`…`, { parse_mode: "Markdown" });
  try {
    const walletResp = await axios.post<WalletVerdict>(
      `${ENGINE_API_URL}/analyze_wallet`,
      { wallet_address: address },
      { timeout: 60_000 },
    );
    lastWalletByChat.set(ctx.chat.id, walletResp.data);
    await ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      formatWalletCard(walletResp.data),
      { parse_mode: "Markdown", reply_markup: walletKeyboard() },
    );
  } catch (err) {
    const walletFailed = axios.isAxiosError(err);
    if (walletFailed) {
      try {
        const tokenResp = await axios.post<TokenVerdict>(
          `${ENGINE_API_URL}/analyze_token`,
          { token_address: address },
          { timeout: 90_000 },
        );
        lastTokenByChat.set(ctx.chat.id, tokenResp.data);
        await ctx.api.editMessageText(
          ctx.chat.id,
          status.message_id,
          formatTokenCard(tokenResp.data),
          { parse_mode: "Markdown" },
        );
        return;
      } catch {
        /* fall through */
      }
    }
    console.error(err);
    await ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      "❌ Engine error. Please try again later.",
    );
  }
}

bot.callbackQuery("reasoning", async (ctx) => {
  const v = lastWalletByChat.get(ctx.chat?.id ?? 0);
  await ctx.answerCallbackQuery();
  if (!v) {
    await ctx.reply("No recent verdict in this chat.");
    return;
  }
  const body = v.reasoning_trace
    .map((t) => {
      const lines = t.findings.map((f) => `  • ${f}`).join("\n");
      return `*${t.agent.toUpperCase()} Agent* (score ${t.score})\n${lines}`;
    })
    .join("\n\n");
  await ctx.reply(body || "No findings.", { parse_mode: "Markdown" });
});

bot.callbackQuery("counter", async (ctx) => {
  const v = lastWalletByChat.get(ctx.chat?.id ?? 0);
  await ctx.answerCallbackQuery();
  if (!v) {
    await ctx.reply("No recent verdict in this chat.");
    return;
  }
  await ctx.reply(
    `⊘ *Counter-argument:*\n${v.counter_argument || "None generated."}`,
    { parse_mode: "Markdown" },
  );
});

bot.callbackQuery("subscribe", async (ctx) => {
  await ctx.answerCallbackQuery("Subscription alerts coming in P1.");
});

bot.callbackQuery("share", async (ctx) => {
  await ctx.answerCallbackQuery("Screenshot this message to share.");
});

bot.start();
console.log(`Mirage bot running; engine at ${ENGINE_API_URL}`);
