import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MIRAGE — Documentation",
  description:
    "Technical documentation for the Mirage anti-adversarial copy-trading intelligence API",
};

/* eslint-disable @next/next/no-img-element */

function MethodBadge({ method }: { method: string }) {
  const color = method === "GET" ? "var(--retro-green)" : "#fbbf24";
  return (
    <span
      style={{
        background: color,
        color: "#1a1a2e",
        padding: "2px 8px",
        fontSize: 7,
        letterSpacing: 1,
        fontWeight: "bold",
        border: "2px solid #1a1a2e",
      }}
    >
      {method}
    </span>
  );
}

function Screenshot({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <div className="space-y-2">
      <div
        style={{
          border: "2px solid var(--retro-border)",
          boxShadow: "4px 4px 0px var(--retro-border)",
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{ width: "100%", display: "block", imageRendering: "auto" }}
        />
      </div>
      <p className="retro-label text-center">{caption}</p>
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className="relative z-20 min-h-screen pb-40">
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        {/* ---- HERO ---- */}
        <header className="text-center space-y-2">
          <div className="inline-block retro-card px-6 py-4">
            <h1 className="text-xl tracking-wider retro-title">|MIRAGE</h1>
          </div>
          <p className="retro-subtitle">
            The Anti-Adversarial Copy-Trading
            <br />
            Intelligence Layer for BNB Chain.
          </p>
        </header>

        <div className="flex flex-wrap justify-center gap-2">
          <a href="/" className="retro-btn">
            HOME
          </a>
          <a href="#product" className="retro-btn">
            PRODUCT
          </a>
          <a href="#architecture" className="retro-btn">
            ARCHITECTURE
          </a>
          <a href="#api" className="retro-btn">
            API
          </a>
          <a href="#agents" className="retro-btn">
            AGENTS
          </a>
          <a href="#features" className="retro-btn retro-btn-primary">
            FEATURES
          </a>
        </div>

        {/* ---- PITCH ---- */}
        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|THE PROBLEM</h2>
          <p className="retro-text">
            Hundreds of thousands of retail traders copy &ldquo;smart money
            wallets&rdquo; on Four.meme every day. They lose — because most of
            those wallets are not smart money. They are adversarial bots built
            to farm copy-traders via bundle coordination, sniper positioning,
            wash trading, and social manipulation.
          </p>
          <p className="retro-text">
            Existing tools (GMGN, Axiom, BullX) rank wallets by PnL — the
            exact metric adversarial bots are engineered to optimize. No tool
            on BNB Chain reasons about whether a &ldquo;smart money&rdquo;
            wallet is itself adversarial.
          </p>
        </div>

        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|THE SOLUTION</h2>
          <p className="retro-text">
            Mirage does not display wallets — it <em>reasons</em> about them.
            For every Four.meme wallet and token, three specialized LLM agents
            (Coin, Wallet, Timing) evaluate structured on-chain features,
            produce a Trust Verdict (Copy / Avoid / Uncertain), and return a
            natural-language reasoning trace the user can read, audit, and
            disagree with.
          </p>
          <p
            className="retro-text"
            style={{ color: "var(--retro-green)", fontStyle: "italic" }}
          >
            Every other tool tells you who&apos;s winning. Mirage tells you
            who&apos;s cheating.
          </p>
        </div>

        {/* ---- PRODUCT SCREENSHOTS ---- */}
        <div id="product" className="retro-card space-y-4">
          <h2 className="retro-heading">|PRODUCT</h2>

          <Screenshot
            src="/screenshots/dashboard-home.jpg"
            alt="Mirage dashboard — home page with wallet scan results"
            caption="Dashboard: paste any address, get an instant verdict with full reasoning"
          />

          <Screenshot
            src="/screenshots/wallet-results.jpg"
            alt="Wallet scan results showing UNCERTAIN verdict with trust score 33/100"
            caption="Wallet verdict: trust score, counter-argument, and three agent analyses"
          />

          <Screenshot
            src="/screenshots/agent-reasoning.jpg"
            alt="Agent reasoning traces from Coin, Wallet, and Timing agents"
            caption="Agent reasoning: each agent scores independently with cited evidence"
          />

          <Screenshot
            src="/screenshots/subscribe-alerts.jpg"
            alt="Subscribe to exit alerts via Telegram"
            caption="Exit watchdog: subscribe to receive Telegram alerts when a wallet starts distributing"
          />
        </div>

        {/* ---- KEY FEATURES ---- */}
        <div className="retro-card space-y-4">
          <h2 className="retro-heading">|KEY DIFFERENTIATORS</h2>
          <div className="space-y-2">
            {[
              [
                "BNB-Native",
                "The only serious copy-trade intelligence product built for BNB Chain, not ported from Solana.",
              ],
              [
                "Reasoning is the product",
                "Every verdict ships with a human-readable chain of thought a trader can audit and override.",
              ],
              [
                "Academically grounded",
                "Direct productization of ACM WWW 2026 research (Luo et al., arXiv 2601.08641). Multi-agent CoT beats zero-shot LLMs and statistical baselines.",
              ],
              [
                "Evidence-cited",
                "Every reasoning claim is bound to a specific block, tx hash, or wallet address. Hallucinations are rejected by a post-processing validator.",
              ],
              [
                "Counter-argument included",
                "Every verdict explains what would need to be true to invalidate it — a trust-building feature no competitor offers.",
              ],
              [
                "Feedback loop",
                "Outcome resolver checks verdicts against on-chain reality after 24h. Adversarial labeler seeds the detection pipeline from confirmed rugs.",
              ],
            ].map(([title, desc], i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="retro-accent mt-0.5">&#9670;</span>
                <span className="retro-text">
                  <strong style={{ color: "var(--retro-dark)" }}>
                    {title}:
                  </strong>{" "}
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- ARCHITECTURE ---- */}
        <div id="architecture" className="retro-card space-y-3">
          <h2 className="retro-heading">|ARCHITECTURE</h2>
          <div className="space-y-2">
            {[
              [
                "Data Ingestion",
                "Moralis Web3 API (BSC mainnet, free tier). Fetches native txs, ERC-20 transfers, token metadata, contract type detection.",
              ],
              [
                "Feature Store",
                "MongoDB with 30-day TTL cache on extracted features. Hot 10-min verdict cache for instant re-queries.",
              ],
              [
                "Orchestration",
                "LangGraph (Python) — three parallel agent nodes + aggregator node. State machine compiles to async DAG.",
              ],
              [
                "LLM Inference",
                "DeepSeek (configurable via env). OpenAI-compatible endpoint. ~$0.001/trace.",
              ],
              [
                "Verdict Store",
                "MongoDB collections: verdicts, outcomes, adversarial labels, subscriptions. Ground-truth training loop.",
              ],
              [
                "Telegram Bot",
                "grammY framework. Unified /analyze command auto-routes wallet vs token. Inline expand for reasoning.",
              ],
              [
                "Web Dashboard",
                "Next.js 16 + Tailwind + pixel theme. Single-page app with auto-detect, results display, and subscribe.",
              ],
              [
                "Background Workers",
                "Outcome resolver (every 30min), exit watchdog (every 60s) — both resilient to dependency outages.",
              ],
            ].map(([label, value], i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="retro-accent mt-0.5">&#9670;</span>
                <span className="retro-text">
                  <strong style={{ color: "var(--retro-dark)" }}>
                    {label}:
                  </strong>{" "}
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- VERDICT FLOW ---- */}
        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|VERDICT FLOW</h2>
          <div className="retro-trace">
            <p style={{ lineHeight: 2.4 }}>
              1. User pastes 0x address
              <br />
              2. Auto-detect: wallet vs ERC-20 token contract (Moralis)
              <br />
              3. Fetch on-chain data (txs, transfers, metadata)
              <br />
              4. Extract 7 structured features (bundle coeff, timing entropy,
              ...)
              <br />
              5. Build evidence pool (block numbers, tx hashes, wallets)
              <br />
              6. Three AI agents reason in parallel
              <br />
              7. Aggregator produces verdict + counter-argument
              <br />
              8. Verdict persisted to MongoDB (ground truth loop)
              <br />
              9. Response: COPY / AVOID / UNCERTAIN + Trust Score 0-100
              <br />
              10. For tokens: analyze top 8 early buyers in parallel
            </p>
          </div>
        </div>

        {/* ---- API REFERENCE ---- */}
        <div id="api" className="retro-card space-y-4">
          <h2 className="retro-heading">|API REFERENCE</h2>
          <p className="retro-text-light">
            Base URL:{" "}
            <span style={{ color: "var(--retro-dark)" }}>
              http://localhost:8000
            </span>{" "}
            &mdash;{" "}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--retro-green)" }}
            >
              Interactive Swagger UI ↗
            </a>
          </p>

          <div className="space-y-3">
            {/* /analyze */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="POST" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /analyze
                </span>
                <span className="retro-label">Auto-Analyze</span>
              </div>
              <p className="retro-text">
                Smart router. Auto-detects whether the address is a wallet or
                ERC-20 token and runs the appropriate pipeline. This is what
                the dashboard and Telegram bot call.
              </p>
              <p className="retro-label" style={{ marginBottom: 2 }}>
                Request
              </p>
              <code
                className="retro-text"
                style={{ color: "var(--retro-green)" }}
              >
                {`{ "address": "0x...", "window_minutes": 8 }`}
              </code>
              <p className="retro-label" style={{ marginBottom: 2 }}>
                Response
              </p>
              <code
                className="retro-text"
                style={{ color: "var(--retro-green)" }}
              >
                {`{ "kind": "wallet"|"token", "verdict": {...} }`}
              </code>
            </div>

            {/* /analyze_wallet */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="POST" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /analyze_wallet
                </span>
                <span className="retro-label">Wallet Trust Verdict</span>
              </div>
              <p className="retro-text">
                Three AI agents (Coin, Wallet, Timing) reason about a BNB
                wallet. Returns verdict, trust score, counter-argument,
                reasoning traces with evidence citations, and extracted
                features.
              </p>
              <p className="retro-label" style={{ marginBottom: 2 }}>
                Request
              </p>
              <code
                className="retro-text"
                style={{ color: "var(--retro-green)" }}
              >
                {`{ "wallet_address": "0x...", "token_address": "0x..." (optional) }`}
              </code>
              <p className="retro-label" style={{ marginBottom: 2 }}>
                Response
              </p>
              <code
                className="retro-text"
                style={{
                  color: "var(--retro-green)",
                  wordBreak: "break-all",
                }}
              >
                {`{ wallet_address, verdict, trust_score, counter_argument, reasoning_trace[], features, verdict_id }`}
              </code>
            </div>

            {/* /analyze_token */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="POST" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /analyze_token
                </span>
                <span className="retro-label">
                  Token Verdict + Ranked Buyers
                </span>
              </div>
              <p className="retro-text">
                Fetches early buyers of a Four.meme token, analyzes each in
                parallel, and produces a token-level verdict with bundle
                contamination score, graduation probability, and ranked buyer
                table.
              </p>
              <p className="retro-label" style={{ marginBottom: 2 }}>
                Request
              </p>
              <code
                className="retro-text"
                style={{ color: "var(--retro-green)" }}
              >
                {`{ "token_address": "0x...", "window_minutes": 8 }`}
              </code>
              <p className="retro-label" style={{ marginBottom: 2 }}>
                Response
              </p>
              <code
                className="retro-text"
                style={{
                  color: "var(--retro-green)",
                  wordBreak: "break-all",
                }}
              >
                {`{ token_address, verdict, trust_score, bundle_contamination_pct, graduation_probability, ranked_buyers[], metadata, total_early_buyers }`}
              </code>
            </div>

            {/* /subscribe */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="POST" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /subscribe
                </span>
                <span className="retro-label">Exit Alert Subscription</span>
              </div>
              <p className="retro-text">
                Subscribe a Telegram chat ID to receive exit-signal watchdog
                alerts when a wallet starts distributing tokens. The watchdog
                polls every 60 seconds and detects net outflows, multi-token
                sells, and transfers to fresh wallets.
              </p>
              <code
                className="retro-text"
                style={{ color: "var(--retro-green)" }}
              >
                {`{ "chat_id": 123456789, "wallet_address": "0x..." }`}
              </code>
            </div>

            {/* /unsubscribe */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="POST" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /unsubscribe
                </span>
                <span className="retro-label">Remove Subscription</span>
              </div>
              <p className="retro-text">
                Remove an existing exit-alert subscription.
              </p>
            </div>

            {/* /verdicts */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="GET" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /verdicts
                </span>
                <span className="retro-label">Verdict History</span>
              </div>
              <p className="retro-text">
                Retrieve verdict history from MongoDB. Filter by kind
                (wallet/token) and limit. Shows verdict_id, address, score,
                resolved status, and final outcome.
              </p>
            </div>

            {/* /accuracy */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="GET" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /accuracy
                </span>
                <span className="retro-label">Accuracy Report</span>
              </div>
              <p className="retro-text">
                Verdict-vs-outcome hit rate. Shows total verdicts, resolved
                count, correct count, and accuracy percentage — the feedback
                loop that makes the system improve over time.
              </p>
            </div>

            {/* /healthz */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="GET" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /healthz
                </span>
                <span className="retro-label">Health Check</span>
              </div>
              <p className="retro-text">
                Component status: cache, chain data (Moralis), store
                (MongoDB), Telegram push, and labeled adversarial set size.
              </p>
            </div>

            {/* admin */}
            <div className="retro-trace space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method="POST" />
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /admin/run_labeler
                </span>
                <span className="retro-label">+</span>
                <span className="retro-heading" style={{ fontSize: 8 }}>
                  /admin/run_resolver
                </span>
              </div>
              <p className="retro-text">
                Manual triggers for the adversarial labeling pipeline and
                outcome resolver. In production these run on cron; exposed as
                endpoints for hackathon demos.
              </p>
            </div>
          </div>
        </div>

        {/* ---- AGENTS ---- */}
        <div id="agents" className="retro-card space-y-4">
          <h2 className="retro-heading">|REASONING AGENTS</h2>
          <p className="retro-text-light">
            Each agent receives the same structured features and evidence pool
            but reasons from a different adversarial lens. All claims must cite
            a block number, tx hash, or wallet address from the evidence pool —
            hallucinations are stripped by a post-processor.
          </p>

          {[
            {
              name: "Coin Agent",
              color: "var(--retro-green)",
              focus: "Token safety, creator history, tokenomics signals",
              signals: [
                "Contract ownership and liquidity lock status",
                "Creator wallet trading history",
                "Token supply distribution concentration",
                "Cross-references with known rug patterns",
              ],
            },
            {
              name: "Wallet Agent",
              color: "var(--retro-green)",
              focus: "Funding sources, cluster behavior, co-buyer overlap",
              signals: [
                "Bundle coefficient — same-block buy coordination",
                "Funding ancestor graph distance to known adversarial wallets",
                "Co-buyer Jaccard similarity across token launches",
                "Cross-token alpha variance (farm bot vs genuine trader)",
              ],
            },
            {
              name: "Timing Agent",
              color: "var(--retro-green)",
              focus: "Block-timing entropy, transaction cadence",
              signals: [
                "Shannon entropy of inter-tx intervals",
                "Bot-like regularity detection (low entropy)",
                "Coordinated same-block activity patterns",
                "Transaction frequency vs natural trading patterns",
              ],
            },
            {
              name: "Aggregator",
              color: "#fbbf24",
              focus:
                "Synthesizes all three agent scores into final verdict",
              signals: [
                "Produces COPY / AVOID / UNCERTAIN verdict",
                "Composite trust score 0-100",
                "Counter-argument: what would invalidate this verdict",
              ],
            },
          ].map((agent, i) => (
            <div key={i} className="retro-trace space-y-2">
              <p className="retro-label" style={{ color: agent.color }}>
                {agent.name}
              </p>
              <p className="retro-text">{agent.focus}</p>
              <div className="space-y-1">
                {agent.signals.map((s, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <span className="retro-accent" style={{ fontSize: 6 }}>
                      &#9632;
                    </span>
                    <span className="retro-text">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ---- FEATURE PIPELINE ---- */}
        <div id="features" className="retro-card space-y-4">
          <h2 className="retro-heading">|FEATURE PIPELINE</h2>
          <p className="retro-text-light">
            Structured signals extracted from on-chain data before LLM
            reasoning. These are what the agents reason about — not raw
            transactions.
          </p>

          <div className="overflow-x-auto">
            <table
              className="w-full"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th
                    className="retro-label text-left"
                    style={{
                      padding: "8px 6px",
                      borderBottom: "2px solid var(--retro-border)",
                    }}
                  >
                    Feature
                  </th>
                  <th
                    className="retro-label text-left"
                    style={{
                      padding: "8px 6px",
                      borderBottom: "2px solid var(--retro-border)",
                    }}
                  >
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "bundle_coefficient",
                    "Fraction of txs sharing a block with another tx (0-1). High = coordinated bundle bot.",
                  ],
                  [
                    "timing_entropy",
                    "Shannon entropy of inter-tx intervals. Low = automated cadence.",
                  ],
                  [
                    "max_co_buyer_jaccard",
                    "Max Jaccard overlap between buyer sets. High = coordinated cluster.",
                  ],
                  [
                    "graph_distance_to_adversarial",
                    "Hops to a known-adversarial wallet via funding chain. 0 = is adversarial, 999 = no connection.",
                  ],
                  [
                    "cross_token_alpha_variance",
                    "PnL variance across tokens. Low = farm bot with engineered returns.",
                  ],
                  [
                    "funding_ancestor_depth",
                    "Length of funding chain back to a CEX or null source.",
                  ],
                  [
                    "distinct_tokens_traded",
                    "Number of unique tokens the wallet has interacted with.",
                  ],
                ].map(([name, desc], i) => (
                  <tr key={i}>
                    <td
                      className="retro-text"
                      style={{
                        padding: "6px",
                        color: "var(--retro-green)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {name}
                    </td>
                    <td className="retro-text" style={{ padding: "6px" }}>
                      {desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- TOKEN ANALYSIS ---- */}
        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|TOKEN ANALYSIS</h2>
          <p className="retro-text">
            When Mirage detects a token contract, it runs a deeper pipeline:
          </p>
          <div className="space-y-2">
            {[
              "Fetch all ERC-20 transfers for the token via Moralis",
              "Identify early buyers in the first N minutes (configurable window, default 8min)",
              "Analyze top 8 buyer wallets in parallel using the wallet pipeline",
              "Calculate bundle contamination % — what fraction of early buys were coordinated",
              "Compute graduation probability — likelihood of healthy token distribution",
              "Rank buyers by trust score — surfaces which early buyers are real vs adversarial",
              "Fetch token metadata (name, symbol, decimals, logo) for display",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="retro-text" style={{ color: "var(--retro-green)" }}>
                  {i + 1}.
                </span>
                <span className="retro-text">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- FEEDBACK LOOP ---- */}
        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|FEEDBACK LOOP</h2>
          <p className="retro-text-light">
            Mirage doesn&apos;t just predict — it verifies. The system
            continuously improves by checking its own verdicts against reality.
          </p>
          <div className="space-y-2">
            {[
              [
                "Outcome Resolver",
                "Runs every 30 minutes. Checks unresolved verdicts older than 24h against on-chain state. Outcomes: rugged, dumped, graduated, held, unknown.",
              ],
              [
                "Adversarial Labeler",
                "Finds resolved rugs and labels the creator + first 50 buyers as adversarial. Repeat offenders (3+ rugs) get promoted to 0.95 confidence.",
              ],
              [
                "Adversarial Set",
                "Hot-loaded into FeatureExtractor on engine startup. The graph_distance_to_adversarial feature measures hops to known bad actors — shorter distance = higher risk.",
              ],
              [
                "Accuracy Endpoint",
                "GET /accuracy?days=30 shows verdict-vs-outcome hit rate. Use this for model evaluation and to demonstrate defensibility.",
              ],
            ].map(([title, desc], i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="retro-accent mt-0.5">&#9670;</span>
                <span className="retro-text">
                  <strong style={{ color: "var(--retro-dark)" }}>
                    {title}:
                  </strong>{" "}
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- EXIT WATCHDOG ---- */}
        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|EXIT WATCHDOG</h2>
          <p className="retro-text">
            Subscribe to any wallet via the dashboard or Telegram bot. The
            watchdog runs every 60 seconds and alerts you when it detects
            distribution behavior:
          </p>
          <div className="space-y-2">
            {[
              "Net outflow of any single ERC-20 exceeding threshold",
              "3+ distinct tokens sold in the recent window",
              "Transfers to freshly-created wallets (funding depth = 0)",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="retro-accent mt-0.5">&#9632;</span>
                <span className="retro-text">{item}</span>
              </div>
            ))}
          </div>
          <p className="retro-text">
            Alerts are pushed via the Telegram Bot API directly. The bot
            process does not need to be running — the engine sends alerts
            independently.
          </p>
        </div>

        {/* ---- TELEGRAM BOT ---- */}
        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|TELEGRAM BOT</h2>
          <p className="retro-text">
            <a
              href="https://t.me/NiksSupportkb_bot"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--retro-green)" }}
            >
              @NiksSupportkb_bot ↗
            </a>
          </p>
          <div className="space-y-2">
            {[
              ["/start", "Welcome message with usage instructions"],
              [
                "/analyze <address>",
                "Auto-detect wallet vs token and return formatted verdict card",
              ],
              [
                "/chatid",
                "Returns your Telegram chat ID for subscribing via the web dashboard",
              ],
              [
                "Paste any 0x address",
                "Auto-triggers analysis without needing a command",
              ],
            ].map(([cmd, desc], i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="retro-text"
                  style={{
                    color: "var(--retro-green)",
                    whiteSpace: "nowrap",
                    minWidth: 120,
                  }}
                >
                  {cmd}
                </span>
                <span className="retro-text">{desc}</span>
              </div>
            ))}
          </div>
          <p className="retro-text">
            Inline buttons: expand full reasoning, view counter-argument,
            subscribe to exit alerts, share screenshot.
          </p>
        </div>

        {/* ---- ENV VARS ---- */}
        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|ENVIRONMENT VARIABLES</h2>
          <div className="retro-trace">
            <p style={{ lineHeight: 2.4 }}>
              # LLM Provider
              <br />
              DEEPSEEK_API_KEY &nbsp;&nbsp;&nbsp;# DeepSeek API key
              <br />
              LLM_MODEL &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;#
              deepseek-chat (default)
              <br />
              LLM_BASE_URL
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# https://api.deepseek.com/v1
              <br />
              <br /># On-Chain Data
              <br />
              MORALIS_API_KEY &nbsp;&nbsp;&nbsp;&nbsp;# BSC chain data (free
              tier)
              <br />
              <br /># Datastore
              <br />
              MONGODB_URI
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Verdict store +
              feature cache
              <br />
              MONGODB_DB
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Database name
              (default: mirage)
              <br />
              <br /># Alerts
              <br />
              TELEGRAM_BOT_TOKEN &nbsp;# Exit-watchdog push alerts
            </p>
          </div>
        </div>

        {/* ---- TECH STACK ---- */}
        <div className="retro-card space-y-3">
          <h2 className="retro-heading">|TECH STACK</h2>
          <div className="overflow-x-auto">
            <table
              className="w-full"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th
                    className="retro-label text-left"
                    style={{
                      padding: "8px 6px",
                      borderBottom: "2px solid var(--retro-border)",
                    }}
                  >
                    Layer
                  </th>
                  <th
                    className="retro-label text-left"
                    style={{
                      padding: "8px 6px",
                      borderBottom: "2px solid var(--retro-border)",
                    }}
                  >
                    Choice
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Data ingestion", "Moralis Web3 API (BSC)"],
                  ["Feature store", "MongoDB Atlas + 30-day TTL cache"],
                  ["Orchestration", "LangGraph (Python)"],
                  ["LLM inference", "DeepSeek via OpenAI-compatible API"],
                  ["Telegram bot", "grammY (TypeScript)"],
                  ["Web", "Next.js 16 + Tailwind CSS 4"],
                  ["API", "FastAPI + uvicorn"],
                ].map(([layer, choice], i) => (
                  <tr key={i}>
                    <td
                      className="retro-text"
                      style={{
                        padding: "6px",
                        color: "var(--retro-dark)",
                        fontWeight: "bold",
                      }}
                    >
                      {layer}
                    </td>
                    <td className="retro-text" style={{ padding: "6px" }}>
                      {choice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- FOOTER ---- */}
        <div className="text-center pb-8 space-y-2">
          <p className="retro-footer">
            Built for the Four.meme AI Sprint (April 8-22, 2026)
          </p>
          <p className="retro-footer">
            MIRAGE &copy; 2026 &bull; BNB CHAIN &bull; FOUR.MEME
          </p>
        </div>
      </div>
    </main>
  );
}
