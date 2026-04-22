import { Bot, InlineKeyboard, type Context } from "grammy";
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
      "Paste any BNB wallet or Four.meme token address and I'll tell you if it's smart money — or cheating.\n\n" +
      "Commands:\n" +
      "• `/analyze <address>` — manual analysis\n" +
      "• `/chatid` — your Telegram chat id (needed to subscribe from the web dashboard)",
    { parse_mode: "Markdown" },
  ),
);

bot.command("chatid", (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  ctx.reply(
    `Your Telegram chat id is:\n\`${chatId}\`\n\nPaste this into the web dashboard's Subscribe box to receive exit-signal alerts here.`,
    { parse_mode: "Markdown" },
  );
});

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

type AnalyzeResponse =
  | { kind: "token"; verdict: TokenVerdict }
  | { kind: "wallet"; verdict: WalletVerdict };

async function handleAddress(ctx: Context, address: string) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const status = await ctx.reply(
    `🔍 Analyzing \`${address}\`…\n_detecting wallet vs token…_`,
    { parse_mode: "Markdown" },
  );
  try {
    const resp = await axios.post<AnalyzeResponse>(
      `${ENGINE_API_URL}/analyze`,
      { address },
      { timeout: 180_000 },
    );
    if (resp.data.kind === "token") {
      lastTokenByChat.set(chatId, resp.data.verdict);
      await ctx.api.editMessageText(
        chatId,
        status.message_id,
        "🪙 Detected as *token* — analyzing early buyers.\n\n" +
          formatTokenCard(resp.data.verdict),
        { parse_mode: "Markdown" },
      );
    } else {
      lastWalletByChat.set(chatId, resp.data.verdict);
      await ctx.api.editMessageText(
        chatId,
        status.message_id,
        "👛 Detected as *wallet* — analyzing trading behavior.\n\n" +
          formatWalletCard(resp.data.verdict),
        { parse_mode: "Markdown", reply_markup: walletKeyboard() },
      );
    }
  } catch (err) {
    console.error(err);
    await ctx.api.editMessageText(
      chatId,
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
  const v = lastWalletByChat.get(ctx.chat?.id ?? 0);
  if (!v || !ctx.chat) {
    await ctx.answerCallbackQuery("No recent wallet verdict to subscribe to.");
    return;
  }
  try {
    await axios.post(`${ENGINE_API_URL}/subscribe`, {
      chat_id: ctx.chat.id,
      wallet_address: v.wallet_address,
    });
    await ctx.answerCallbackQuery("🔔 Subscribed — you'll get exit signals.");
    await ctx.reply(
      `🔔 *Watchdog armed* on \`${v.wallet_address}\`\n` +
        `You'll receive an alert if Mirage detects distribution or exit behavior.`,
      { parse_mode: "Markdown" },
    );
  } catch (err) {
    const msg =
      axios.isAxiosError(err) && err.response?.data?.detail
        ? err.response.data.detail
        : "Subscription failed.";
    await ctx.answerCallbackQuery(msg);
  }
});

bot.callbackQuery("share", async (ctx) => {
  await ctx.answerCallbackQuery("Screenshot this message to share.");
});

bot.start();
console.log(`Mirage bot running; engine at ${ENGINE_API_URL}`);
