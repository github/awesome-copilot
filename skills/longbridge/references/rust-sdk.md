

---
<!-- overview.md -->

# Rust SDK Overview

**Crate:** `longbridge` v4.0.5
**Docs:** https://longbridge.github.io/openapi/rust/longbridge/

## Add to Cargo.toml

```toml
[dependencies]
longbridge = "4.0.5"
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }
rust_decimal = "1"
time = "0.3"
```

> **Note:** Previously named `longport`. The crate was renamed to `longbridge`.

## Import

```rust
use longbridge::{
    Config, Market, QuoteContext, TradeContext,
    quote::{Period, SubFlags, AdjustType, TradeSessions, PushEvent},
    trade::{OrderType, OrderSide, TimeInForceType, OutsideRTH, SubmitOrderOptions},
    Decimal,
};
```

## Authentication

### OAuth 2.0 (Recommended)

```rust
use longbridge::{Config, QuoteContext};
use longbridge_oauth::OAuthBuilder;  // in oauth crate

// Token cached at ~/.longbridge/openapi/tokens/<client_id>
let oauth = OAuthBuilder::new("your-client-id")
    .build(|url| println!("Open URL to authorize: {url}"))
    .await?;
let config = Config::from_oauth(oauth);
```

## Config Options

```rust
use std::sync::Arc;
use longbridge::{Config, Language, PushCandlestickMode};

let config = Arc::new(
    Config::from_oauth(oauth)
        .language(Language::EN)
        .enable_overnight(false)
        .push_candlestick_mode(PushCandlestickMode::Realtime)
);
```

## Creating Contexts

The Rust SDK is **async-only** (tokio). Both contexts return a channel receiver for push events.

```rust
use std::sync::Arc;
use longbridge::{Config, QuoteContext, TradeContext};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let oauth = OAuthBuilder::new("your-client-id")
        .build(|url| println!("Open URL to authorize: {url}"))
        .await?;
    let config = Arc::new(Config::from_oauth(oauth));

    // Returns (context, push_receiver)
    let (quote_ctx, mut push_rx) = QuoteContext::new(config.clone());
    let (trade_ctx, mut order_rx) = TradeContext::new(config);

    // Spawn push handler
    tokio::spawn(async move {
        while let Some(event) = push_rx.recv().await {
            println!("Push: {:?}", event);
        }
    });

    Ok(())
}
```

## Push Event Handling

`QuoteContext::new` returns `mpsc::UnboundedReceiver<PushEvent>`.

```rust
use longbridge::quote::PushEvent;

while let Some(event) = push_rx.recv().await {
    match event {
        PushEvent::Quote(e)       => println!("{}: last={}", e.symbol, e.last_done),
        PushEvent::Depth(e)       => println!("{}: {} asks", e.symbol, e.asks.len()),
        PushEvent::Brokers(e)     => println!("brokers: {}", e.symbol),
        PushEvent::Trade(e)       => println!("trade: {}", e.symbol),
        PushEvent::Candlestick(e) => println!("candle: {}", e.symbol),
    }
}
```

`TradeContext::new` returns `mpsc::UnboundedReceiver<longbridge::trade::PushEvent>`.

```rust
use longbridge::trade::PushEvent as TradePushEvent;

while let Some(event) = order_rx.recv().await {
    match event {
        TradePushEvent::OrderChanged(o) => println!("Order {} -> {:?}", o.order_id, o.status),
    }
}
```

## Error Handling

```rust
use longbridge::Error;

match ctx.quote(["INVALID.XX"]).await {
    Ok(quotes) => { /* ... */ }
    Err(Error::OpenApi { code, message, .. }) => eprintln!("API error {code}: {message}"),
    Err(e) => eprintln!("Other error: {e}"),
}
```

## Environment Variables

Same as Python SDK — see [Python overview](../python-sdk/overview.md#environment-variables).


---
<!-- quote-context.md -->

# Rust SDK — QuoteContext

All methods are `async` and return `Result<T>`.

## Creation

```rust
let (ctx, push_rx) = QuoteContext::new(Arc::new(config));
```

## Subscriptions

### subscribe / unsubscribe

```rust
use longbridge::quote::SubFlags;

// SubFlags are bit-flags, combine with |
ctx.subscribe(["700.HK", "AAPL.US"], SubFlags::QUOTE | SubFlags::DEPTH).await?;
ctx.unsubscribe(["AAPL.US"], SubFlags::QUOTE).await?;

let subs = ctx.subscriptions().await?;  // Vec<Subscription>
```

**SubFlags:**
```rust
SubFlags::QUOTE    // Real-time quote
SubFlags::DEPTH    // Level 2 order book
SubFlags::BROKER   // HK broker queue
SubFlags::TRADE    // Tick-by-tick trades
```

### subscribe_candlesticks

```rust
use longbridge::quote::{Period, TradeSessions};

// Returns initial snapshot; push arrives via push_rx
let candles = ctx.subscribe_candlesticks("700.HK", Period::Day).await?;
ctx.unsubscribe_candlesticks("700.HK", Period::Day).await?;
```

## Market Data

### static_info

```rust
let infos = ctx.static_info(["700.HK", "AAPL.US"]).await?;
// Vec<SecurityStaticInfo>: symbol, name_en, name_zh, exchange, currency, lot_size, etc.
```

### quote

```rust
let quotes = ctx.quote(["700.HK", "AAPL.US"]).await?;
// Vec<SecurityQuote>: symbol, last_done, prev_close_price, open, high, low, volume, turnover
```

### option_quote / warrant_quote

```rust
let opt = ctx.option_quote(["AAPL230317P160000.US"]).await?;  // Vec<OptionQuote>
let war = ctx.warrant_quote(["21125.HK"]).await?;              // Vec<WarrantQuote>
```

### depth

```rust
let depth = ctx.depth("700.HK").await?;
// SecurityDepth { asks: Vec<Depth>, bids: Vec<Depth> }
// Depth { position, price, volume, order_num }
```

### brokers

```rust
let brokers = ctx.brokers("700.HK").await?;
// SecurityBrokers { ask_brokers: Vec<Brokers>, bid_brokers: Vec<Brokers> }
```

### participants

```rust
let participants = ctx.participants().await?;  // Vec<ParticipantInfo> (HK only)
```

### trades

```rust
let trades = ctx.trades("700.HK", 50).await?;  // Vec<Trade>, max 1000
```

### intraday

```rust
use longbridge::quote::TradeSessions;

let lines = ctx.intraday("700.HK", TradeSessions::Intraday).await?;  // Vec<IntradayLine>
let lines = ctx.intraday("700.HK", TradeSessions::All).await?;       // include pre/post
```

### candlesticks (recent N)

```rust
use longbridge::quote::{Period, AdjustType, TradeSessions};

let candles = ctx.candlesticks("700.HK", Period::Day, 100, AdjustType::NoAdjust, TradeSessions::Intraday).await?;
// Vec<Candlestick>: close, open, high, low, volume, turnover, trade_session, timestamp
```

### history_candlesticks_by_offset

```rust
use time::macros::datetime;

let candles = ctx.history_candlesticks_by_offset(
    "700.HK",
    Period::Day,
    AdjustType::NoAdjust,
    false,      // forward: false = look backward from `time`
    100,
    Some(datetime!(2024-01-01 00:00 UTC)),
    TradeSessions::Intraday,
).await?;
```

### history_candlesticks_by_date

```rust
use time::macros::date;

let candles = ctx.history_candlesticks_by_date(
    "700.HK",
    Period::Day,
    AdjustType::ForwardAdjust,
    Some(date!(2024-01-01)),
    Some(date!(2024-12-31)),
    TradeSessions::Intraday,
).await?;
```

## Options

```rust
use time::macros::date;

let dates   = ctx.option_chain_expiry_date_list("AAPL.US").await?;   // Vec<Date>
let strikes = ctx.option_chain_info_by_date("AAPL.US", date!(2024-01-19)).await?;
// Vec<StrikePriceInfo>: price, call_symbol, put_symbol, standard
```

## Warrants

```rust
use longbridge::quote::{WarrantSortBy, SortOrderType};

let issuers = ctx.warrant_issuers().await?;   // Vec<IssuerInfo>

let warrants = ctx.warrant_list(
    "700.HK",
    WarrantSortBy::LastDone,
    SortOrderType::Ascending,
    Default::default(),  // WarrantListOptions (optional filters)
).await?;  // Vec<WarrantInfo>
```

## Trading Calendar

```rust
use longbridge::Market;
use time::macros::date;

let sessions = ctx.trading_session().await?;
// Vec<MarketTradingSession>

let days = ctx.trading_days(Market::HK, date!(2024-01-01), date!(2024-03-31)).await?;
// MarketTradingDays { trading_days, half_trading_days }
```

## Capital & Indexes

```rust
use longbridge::quote::CalcIndex;

let flow = ctx.capital_flow("700.HK").await?;          // Vec<CapitalFlowLine>
let dist = ctx.capital_distribution("700.HK").await?;  // CapitalDistributionResponse

let indexes = ctx.calc_indexes(
    ["700.HK", "AAPL.US"],
    [CalcIndex::LastDone, CalcIndex::PeTtmRatio, CalcIndex::PbRatio],
).await?;  // Vec<SecurityCalcIndex>
```

## Watchlist

```rust
use longbridge::quote::{RequestCreateWatchlistGroup, RequestUpdateWatchlistGroup};

let groups = ctx.watchlist().await?;   // Vec<WatchlistGroup>

let group_id = ctx.create_watchlist_group(RequestCreateWatchlistGroup {
    name: "My Group".into(),
    securities: vec!["700.HK".into(), "AAPL.US".into()],
}).await?;  // i64

ctx.update_watchlist_group(RequestUpdateWatchlistGroup {
    id: group_id,
    name: Some("Updated".into()),
    securities: vec!["TSLA.US".into()],
    mode: Some(SecuritiesUpdateMode::Add),
}).await?;

ctx.delete_watchlist_group(group_id, false).await?;
```

## Security List & Market Temperature

```rust
use longbridge::{Market, quote::SecurityListCategory};
use time::macros::date;

let secs = ctx.security_list(Market::HK, None).await?;   // Vec<Security>
let temp = ctx.market_temperature(Market::HK).await?;    // MarketTemperature
let hist = ctx.history_market_temperature(
    Market::HK, date!(2024-01-01), date!(2024-03-31)
).await?;
```

## Realtime Cache

After subscribing, get cached data without a network call:

```rust
let quotes   = ctx.realtime_quote(["700.HK"]).await?;      // Vec<RealtimeQuote>
let depth    = ctx.realtime_depth("700.HK").await?;         // SecurityDepth
let brokers  = ctx.realtime_brokers("700.HK").await?;       // SecurityBrokers
let trades   = ctx.realtime_trades("700.HK", 100).await?;   // Vec<Trade>
```

## Account Info

```rust
let id       = ctx.member_id().await?;               // i64
let level    = ctx.quote_level().await?;              // String
let packages = ctx.quote_package_details().await?;    // Vec<QuotePackageDetail>
```


---
<!-- trade-context.md -->

# Rust SDK — TradeContext

All methods are `async` and return `Result<T>`.

## Creation

```rust
let (ctx, order_rx) = TradeContext::new(Arc::new(config));

// Spawn push handler
tokio::spawn(async move {
    use longbridge::trade::PushEvent;
    while let Some(event) = order_rx.recv().await {
        match event {
            PushEvent::OrderChanged(o) => println!("Order {} -> {:?}", o.order_id, o.status),
        }
    }
});
```

## Subscribe to Order Push

```rust
use longbridge::trade::TopicType;

ctx.subscribe([TopicType::Private]).await?;
ctx.unsubscribe([TopicType::Private]).await?;
```

## Submit Order

```rust
use longbridge::{Decimal, trade::{SubmitOrderOptions, OrderType, OrderSide, TimeInForceType}};

let opts = SubmitOrderOptions::new(
    "700.HK",
    OrderType::LO,
    OrderSide::Buy,
    Decimal::from(200),
    TimeInForceType::Day,
)
.submitted_price(Decimal::from_str("50.00").unwrap())
.remark("my order".into());

let resp = ctx.submit_order(opts).await?;
println!("Order ID: {}", resp.order_id);
```

**Builder methods for special order types:**

```rust
// LIT / MIT
opts.trigger_price(Decimal::from_str("48.00")?)

// Trailing orders (TSLPAMT)
opts.limit_offset(Decimal::from_str("1.00")?)
    .trailing_amount(Decimal::from_str("2.00")?)

// GTD
opts.expire_date(date!(2024-12-31))

// US pre/post market
opts.outside_rth(OutsideRTH::AnyTime)
```

## Replace / Cancel Order

```rust
use longbridge::trade::ReplaceOrderOptions;

let opts = ReplaceOrderOptions::new("709043056541253632", Decimal::from(100))
    .price(Decimal::from_str("100.00")?);
ctx.replace_order(opts).await?;

ctx.cancel_order("709043056541253632").await?;
```

## Query Orders

```rust
use longbridge::trade::{GetHistoryOrdersOptions, GetTodayOrdersOptions, OrderStatus, OrderSide};

// Today's orders
let orders = ctx.today_orders(None).await?;  // Vec<Order>

// With filters
let orders = ctx.today_orders(Some(GetTodayOrdersOptions::new()
    .symbol("700.HK")
    .status([OrderStatus::Filled, OrderStatus::New])
    .side(OrderSide::Buy)
)).await?;

// Historical orders (does not include today)
let orders = ctx.history_orders(
    GetHistoryOrdersOptions::new()
        .symbol("700.HK")
        .start_at(datetime!(2024-01-01 00:00 UTC))
        .end_at(datetime!(2024-12-31 23:59 UTC))
).await?;

// Order detail
let detail = ctx.order_detail("701276261045858304").await?;  // OrderDetail
```

## Executions

```rust
use longbridge::trade::GetHistoryExecutionsOptions;

// Today's fills
let execs = ctx.today_executions(None).await?;    // Vec<Execution>

// Historical fills
let execs = ctx.history_executions(
    GetHistoryExecutionsOptions::new()
        .symbol("700.HK")
        .start_at(datetime!(2024-01-01 00:00 UTC))
        .end_at(datetime!(2024-12-31 23:59 UTC))
).await?;
// Execution: order_id, trade_id, symbol, trade_done_at, quantity, price
```

## Account Balance

```rust
let balances = ctx.account_balance(None).await?;         // Vec<AccountBalance>
let balances = ctx.account_balance(Some("HKD")).await?;  // filter by currency
```

## Cash Flow

```rust
use longbridge::trade::GetCashFlowOptions;

let flows = ctx.cash_flow(
    GetCashFlowOptions::new(
        datetime!(2024-01-01 00:00 UTC),
        datetime!(2024-12-31 23:59 UTC),
    )
    .symbol("700.HK")     // optional
).await?;  // Vec<CashFlow>
```

## Positions

```rust
let stock = ctx.stock_positions(None).await?;
// StockPositionsResponse { channels: Vec<StockPositionChannel> }
// StockPositionChannel { account_channel, positions: Vec<StockPosition> }
// StockPosition: symbol, symbol_name, quantity, available_quantity, currency, cost_price

let fund = ctx.fund_positions(None).await?;
// FundPositionsResponse { channels: Vec<FundPositionChannel> }
```

## Margin & Estimation

```rust
let ratio = ctx.margin_ratio("TSLA.US").await?;
// MarginRatio { im_factor, mm_factor, fm_factor }

let est = ctx.estimate_max_purchase_quantity(
    "700.HK",
    OrderType::LO,
    OrderSide::Buy,
    Some(Decimal::from_str("50.00")?),
    None,   // currency
    None,   // order_id
    false,  // fractional_shares
).await?;
// EstimateMaxPurchaseQuantityResponse { cash_max_qty, margin_max_qty }
```

## Complete Example

```rust
use std::sync::Arc;
use longbridge::{Config, TradeContext, Decimal, trade::{SubmitOrderOptions, OrderType, OrderSide, TimeInForceType}};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Arc::new(Config::from_apikey_env()?);
    let (ctx, _rx) = TradeContext::new(config);

    // Check balance before trading
    let balances = ctx.account_balance(None).await?;
    println!("Balance: {:?}", balances);

    // Place a limit buy order
    let resp = ctx.submit_order(
        SubmitOrderOptions::new(
            "700.HK",
            OrderType::LO,
            OrderSide::Buy,
            Decimal::from(100),
            TimeInForceType::Day,
        )
        .submitted_price(Decimal::from_str("45.00")?)
    ).await?;
    println!("Order placed: {}", resp.order_id);

    Ok(())
}
```


---
<!-- content.md -->

# Rust SDK — Content (News, Filings, Topics)

## ContentContext

Used for news and community discussion topics. Requires a separate context from QuoteContext.

```rust
use longbridge::{Config, content::ContentContext};
use std::sync::Arc;

let config = Arc::new(Config::from_apikey_env()?);
let content_ctx = ContentContext::try_new(config)?;
```

### news

```rust
let news = content_ctx.news("TSLA.US").await?;  // Vec<NewsItem>
for item in &news {
    println!("{}: {} ({})", item.published_at, item.title, item.url);
}
```

**NewsItem fields:**
- `id: String` — News ID
- `title: String` — Headline
- `description: String` — Summary
- `url: String` — Full article URL
- `published_at: OffsetDateTime`
- `comments_count: i32`
- `likes_count: i32`
- `shares_count: i32`

### topics

```rust
let topics = content_ctx.topics("700.HK").await?;  // Vec<TopicItem>
for item in &topics {
    println!("{}: {} ({} likes)", item.published_at, item.title, item.likes_count);
}
```

**TopicItem fields:** same structure as `NewsItem`.

---

## Filings (via QuoteContext)

Regulatory filings are accessed through `QuoteContext`, not `ContentContext`.

```rust
let (quote_ctx, _rx) = QuoteContext::new(config.clone());

let filings = quote_ctx.filings("AAPL.US").await?;  // Vec<FilingItem>
for f in &filings {
    println!("{}: {} — files: {:?}", f.published_at, f.title, f.file_urls);
}
```

**FilingItem fields:**
- `id: String` — Filing ID
- `title: String` — Filing title
- `description: String` — Summary
- `file_name: String` — Primary file name
- `file_urls: Vec<String>` — Download URLs
- `published_at: OffsetDateTime`

---

## Complete Example

```rust
use std::sync::Arc;
use longbridge::{Config, QuoteContext, content::ContentContext};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Arc::new(Config::from_apikey_env()?);
    let content = ContentContext::try_new(config.clone())?;
    let (quote, _rx) = QuoteContext::new(config);

    // Fetch all content in parallel
    let (news, topics, filings) = tokio::join!(
        content.news("TSLA.US"),
        content.topics("TSLA.US"),
        quote.filings("TSLA.US"),
    );

    println!("News: {}", news?.len());
    println!("Topics: {}", topics?.len());
    println!("Filings: {}", filings?.len());
    Ok(())
}
```

---

## Note: Python SDK

The Python SDK does not expose a `ContentContext`. For news/filings/topics in Python, use:

1. **CLI** — `longbridge news SYMBOL`, `longbridge filing SYMBOL`, `longbridge topic SYMBOL`
2. **HttpClient** — raw HTTP calls to `/v1/content/{symbol}/news`, `/v1/content/{symbol}/topics`, `/v1/quote/filings`
3. **MCP** — `news`, `topics`, `filings` tools

```python
# Python: via HttpClient
http = HttpClient.from_oauth(oauth)
news = http.request("get", "/v1/content/TSLA.US/news")
topics = http.request("get", "/v1/content/TSLA.US/topics")
filings = http.request("get", "/v1/quote/filings", body={"symbol": "TSLA.US"})
```


---
<!-- types.md -->

# Rust SDK — Types & Enums

All types are in the `longbridge` crate. Key modules: `longbridge::quote`, `longbridge::trade`.

## SubFlags — Quote subscription (bit-flags)

```rust
use longbridge::quote::SubFlags;

SubFlags::QUOTE    // Real-time quote
SubFlags::DEPTH    // Level 2 order book
SubFlags::BROKER   // HK broker queue
SubFlags::TRADE    // Tick-by-tick trades

// Combine:
SubFlags::QUOTE | SubFlags::DEPTH
```

## Period — Candlestick periods

```rust
use longbridge::quote::Period;

Period::OneMinute    Period::TwoMinute     Period::ThreeMinute
Period::FiveMinute   Period::TenMinute     Period::FifteenMinute
Period::TwentyMinute Period::ThirtyMinute  Period::FortyFiveMinute
Period::SixtyMinute  Period::TwoHour       Period::ThreeHour    Period::FourHour
Period::Day          Period::Week          Period::Month
Period::Quarter      Period::Year
```

**MCP string equivalents:** `"1m"`, `"2m"`, `"3m"`, `"5m"`, `"10m"`, `"15m"`, `"20m"`, `"30m"`, `"45m"`, `"60m"`, `"120m"`, `"180m"`, `"240m"`, `"day"`, `"week"`, `"month"`, `"quarter"`, `"year"`

## AdjustType

```rust
use longbridge::quote::AdjustType;

AdjustType::NoAdjust       // Actual (unadjusted)
AdjustType::ForwardAdjust  // Forward-adjusted for splits/dividends
```

## TradeSessions

```rust
use longbridge::quote::TradeSessions;

TradeSessions::Intraday   // Regular trading hours only
TradeSessions::All        // All sessions (pre, intraday, post, overnight)
```

## Market

```rust
use longbridge::Market;

Market::HK    // Hong Kong
Market::US    // United States
Market::CN    // China (SH/SZ)
Market::SG    // Singapore
```

## OrderSide

```rust
use longbridge::trade::OrderSide;

OrderSide::Buy
OrderSide::Sell
```

## OrderType

```rust
use longbridge::trade::OrderType;

OrderType::LO        // Limit Order
OrderType::ELO       // Enhanced Limit Order (HK only)
OrderType::MO        // Market Order
OrderType::AO        // At-Auction Order
OrderType::ALO       // At-Auction Limit Order  // codespell:ignore ALO
OrderType::ODD       // Odd Lots Order
OrderType::LIT       // Limit If Touched
OrderType::MIT       // Market If Touched
OrderType::TSLPAMT   // Trailing Limit (Trailing Amount)
OrderType::TSLPPCT   // Trailing Limit (Trailing Percent)
OrderType::TSMAMT    // Trailing Market (Trailing Amount)
OrderType::TSMPCT    // Trailing Market (Trailing Percent)
OrderType::SLO       // Special Limit Order (HK only)
```

## OrderStatus

```rust
use longbridge::trade::OrderStatus;

OrderStatus::NotReported      OrderStatus::New             OrderStatus::WaitToNew
OrderStatus::PartialFilled    OrderStatus::Filled          OrderStatus::WaitToReplace
OrderStatus::PendingReplace   OrderStatus::Replaced        OrderStatus::WaitToCancel
OrderStatus::PendingCancel    OrderStatus::Rejected        OrderStatus::Canceled
OrderStatus::Expired          OrderStatus::PartialWithdrawal
```

## TimeInForceType

```rust
use longbridge::trade::TimeInForceType;

TimeInForceType::Day              // Day order
TimeInForceType::GoodTilCanceled  // GTC
TimeInForceType::GoodTilDate      // GTD — use .expire_date()
```

## OutsideRTH (US only)

```rust
use longbridge::trade::OutsideRTH;

OutsideRTH::RTH_Only   // Regular hours only (default)
OutsideRTH::AnyTime    // Pre and post market
OutsideRTH::Overnight  // Overnight session
```

## TopicType (trade push)

```rust
use longbridge::trade::TopicType;

TopicType::Private  // Order change notifications
```

## CalcIndex

```rust
use longbridge::quote::CalcIndex;

// Key indexes:
CalcIndex::LastDone          CalcIndex::ChangeValue       CalcIndex::ChangeRate
CalcIndex::Volume            CalcIndex::Turnover          CalcIndex::TotalMarketValue
CalcIndex::PeTtmRatio        CalcIndex::PbRatio           CalcIndex::DividendRatioTtm
CalcIndex::YtdChangeRate     CalcIndex::ImpliedVolatility CalcIndex::Delta
CalcIndex::Gamma             CalcIndex::Theta             CalcIndex::Vega
// ... see Python types.md for full list
```

## Push Events

### QuoteContext push

```rust
use longbridge::quote::PushEvent;

PushEvent::Quote(PushQuote)          // last_done, open, high, low, volume, turnover
PushEvent::Depth(PushDepth)          // asks: Vec<Depth>, bids: Vec<Depth>
PushEvent::Brokers(PushBrokers)      // ask_brokers, bid_brokers
PushEvent::Trade(PushTrades)         // trades: Vec<Trade>
PushEvent::Candlestick(PushCandlestick)  // candlestick, period
```

### TradeContext push

```rust
use longbridge::trade::PushEvent;

PushEvent::OrderChanged(PushOrderChanged)
// Fields: order_id, symbol, status, side, filled_qty, price, msg
```

## Language

```rust
use longbridge::Language;

Language::EN     // English (default)
Language::ZH_CN  // Simplified Chinese
Language::ZH_HK  // Traditional Chinese
```

## PushCandlestickMode

```rust
use longbridge::PushCandlestickMode;

PushCandlestickMode::Realtime   // Push every tick update
PushCandlestickMode::Confirmed  // Push only after candle closes
```

## Decimal

Rust SDK uses `rust_decimal::Decimal` for all prices and quantities:

```rust
use longbridge::Decimal;  // re-export of rust_decimal::Decimal
use std::str::FromStr;

let price = Decimal::from_str("50.00")?;
let qty   = Decimal::from(200u32);
```

## SecuritiesUpdateMode (watchlist)

```rust
use longbridge::quote::SecuritiesUpdateMode;

SecuritiesUpdateMode::Add     // Append securities
SecuritiesUpdateMode::Remove  // Remove securities
SecuritiesUpdateMode::Replace // Replace all
```

## Error Type

```rust
use longbridge::Error;

match result {
    Err(Error::OpenApi { code, message, trace_id, .. }) => { /* API error */ }
    Err(Error::Http { .. })  => { /* network/HTTP error */ }
    Err(e) => { /* other */ }
}
```
