

---
<!-- overview.md -->

# Python SDK Overview

**Docs:** https://longbridge.github.io/openapi/python/index.html

## Install

```bash
pip install longbridge
```

> **Note:** The package was previously named `longport`. If upgrading, run `pip uninstall longport` first.

## Import

```python
from longbridge.openapi import (
    Config, OAuthBuilder,
    QuoteContext, AsyncQuoteContext,
    TradeContext, AsyncTradeContext,
    ContentContext, AsyncContentContext,
    HttpClient,
)
```

## Authentication

### OAuth 2.0 (Recommended)

Token cached at `~/.longbridge/openapi/tokens/<client_id>`. Re-runs browser auth only when token is expired.

**Register once:**

```bash
curl -X POST https://openapi.longbridge.com/oauth2/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"My App","redirect_uris":["http://localhost:60355/callback"],"grant_types":["authorization_code","refresh_token"],"response_types":["code"]}'
# Response: {"client_id": "your-client-id", ...}
```

**Sync:**

```python
from longbridge.openapi import OAuthBuilder, Config

oauth = OAuthBuilder("your-client-id").build(
    lambda url: print(f"Open this URL to authorize: {url}")
)
config = Config.from_oauth(oauth)
```

**Async:**

```python
import asyncio
from longbridge.openapi import OAuthBuilder, Config

async def main():
    oauth = await OAuthBuilder("your-client-id").build_async(
        lambda url: print(f"Open this URL to authorize: {url}")
    )
    config = Config.from_oauth(oauth)

asyncio.run(main())
```

## Config Options

```python
Config.from_oauth(
    oauth,
    http_url=None,           # override LONGBRIDGE_HTTP_URL
    quote_ws_url=None,       # override LONGBRIDGE_QUOTE_WS_URL
    trade_ws_url=None,       # override LONGBRIDGE_TRADE_WS_URL
    language=None,           # Language.ZH_CN / Language.ZH_HK / Language.EN
    enable_overnight=False,  # enable overnight quote
    push_candlestick_mode=PushCandlestickMode.Realtime,
    enable_print_quote_packages=True,
    log_path=None,           # path to log directory
)
```

## Environment Variables

| Variable                           | Description               | Default                                 |
| ---------------------------------- | ------------------------- | --------------------------------------- |
| `LONGBRIDGE_LANGUAGE`              | `zh-CN`, `zh-HK`, `en`    | `en`                                    |
| `LONGBRIDGE_HTTP_URL`              | HTTP endpoint             | `https://openapi.longbridge.com`        |
| `LONGBRIDGE_QUOTE_WS_URL`          | Quote WebSocket           | `wss://openapi-quote.longbridge.com/v2` |
| `LONGBRIDGE_TRADE_WS_URL`          | Trade WebSocket           | `wss://openapi-trade.longbridge.com/v2` |
| `LONGBRIDGE_ENABLE_OVERNIGHT`      | Enable overnight quotes   | `false`                                 |
| `LONGBRIDGE_PUSH_CANDLESTICK_MODE` | `realtime` or `confirmed` | `realtime`                              |
| `LONGBRIDGE_PRINT_QUOTE_PACKAGES`  | Print packages on connect | `true`                                  |
| `LONGBRIDGE_LOG_PATH`              | Log file directory        | (no logs)                               |

**China Mainland:** SDK auto-selects `.cn` endpoints. To force: `LONGBRIDGE_REGION=cn` or `LONGBRIDGE_REGION=hk`.

## HttpClient (Raw HTTP)

For endpoints not wrapped by the typed SDK contexts:

```python
from longbridge.openapi import HttpClient, OAuthBuilder

oauth = OAuthBuilder("your-client-id").build(lambda url: print(url))
http_cli = HttpClient.from_oauth(oauth)

# Sync GET
resp = http_cli.request("get", "/v1/trade/execution/today")
print(resp)  # parsed JSON dict/list

# Sync POST
resp = http_cli.request("post", "/v1/trade/order",
    body={"symbol": "700.HK", "order_type": "LO", "side": "Buy",
          "submitted_quantity": "100", "time_in_force": "Day",
          "submitted_price": "50.00"})

# Async GET
resp = await http_cli.request_async("get", "/v1/trade/execution/today")

# With custom headers
resp = http_cli.request("get", "/v1/some/endpoint",
    headers={"X-Custom-Header": "value"})
```


## Sync vs Async

| Class                 | Nature          | When to use                                |
| --------------------- | --------------- | ------------------------------------------ |
| `QuoteContext`        | Sync            | Scripts, data pipelines, simple tools      |
| `AsyncQuoteContext`   | Async (asyncio) | Concurrent fetches, FastAPI, Jupyter async |
| `TradeContext`        | Sync            | Scripts, command-line tools                |
| `AsyncTradeContext`   | Async (asyncio) | Async servers, concurrent trade ops        |
| `ContentContext`      | Sync            | Fetch news and discussion topics           |
| `AsyncContentContext` | Async (asyncio) | Async news/topics fetching                 |

Both variants share identical method signatures — async versions return awaitables instead of values.

## Error Handling

```python
from longbridge.openapi import OpenApiException

try:
    quotes = ctx.quote(["INVALID.XX"])
except OpenApiException as e:
    print(f"kind={e.kind}, code={e.code}, trace_id={e.trace_id}")
    print(f"message={e.message}")
```

`e.kind`: `ErrorKind.Http`, `ErrorKind.OpenApi`, or `ErrorKind.Other`


---
<!-- quote-context.md -->

# Python SDK — QuoteContext

`QuoteContext` (sync) / `AsyncQuoteContext` (async) — market data, subscriptions, watchlist.

## Creation

```python
# Sync
ctx = QuoteContext(config)

# Async — use classmethod, NOT constructor
ctx = AsyncQuoteContext.create(config)
# or with explicit loop for async callbacks:
ctx = AsyncQuoteContext.create(config, loop_=asyncio.get_running_loop())
```

## Push Subscriptions

### Set callbacks (both sync and async contexts)

```python
ctx.set_on_quote(lambda symbol, event: print(symbol, event))
ctx.set_on_depth(lambda symbol, event: print(symbol, event))
ctx.set_on_brokers(lambda symbol, event: print(symbol, event))
ctx.set_on_trades(lambda symbol, event: print(symbol, event))
ctx.set_on_candlestick(lambda symbol, event: print(symbol, event))
```

`AsyncQuoteContext` callbacks may be `async def` — they are scheduled on the running event loop.

Push types: `PushQuote`, `PushDepth`, `PushBrokers`, `PushTrades`, `PushCandlestick`

### subscribe / unsubscribe

```python
ctx.subscribe(["700.HK", "AAPL.US"], [SubType.Quote, SubType.Depth])
ctx.unsubscribe(["AAPL.US"], [SubType.Quote])
resp = ctx.subscriptions()  # List[Subscription]
```

### subscribe_candlesticks

```python
# Returns initial snapshot; push arrives via set_on_candlestick
candles = ctx.subscribe_candlesticks("700.HK", Period.Min_1, TradeSessions.Intraday)
ctx.unsubscribe_candlesticks("700.HK", Period.Min_1)
```

## Market Data (pull)

### static_info

```python
resp = ctx.static_info(["700.HK", "AAPL.US"])  # List[SecurityStaticInfo]
# Fields: symbol, name_en, name_zh, exchange, currency, lot_size,
#         total_shares, circulating_shares, eps, eps_ttm, bps, dividend_yield
```

### quote

```python
resp = ctx.quote(["700.HK", "AAPL.US", "TSLA.US"])  # List[SecurityQuote]
# Fields: symbol, last_done, prev_close_price, open, high, low, volume, turnover,
#         trade_session, trade_status, pre_market_quote, post_market_quote
```

### option_quote / warrant_quote

```python
resp = ctx.option_quote(["AAPL230317P160000.US"])   # List[OptionQuote]
resp = ctx.warrant_quote(["21125.HK"])              # List[WarrantQuote]
```

### depth

```python
resp = ctx.depth("700.HK")     # SecurityDepth
# resp.asks: List[Depth], resp.bids: List[Depth]
# Depth fields: position, price, volume, order_num
```

### brokers

```python
resp = ctx.brokers("700.HK")   # SecurityBrokers
# resp.ask_brokers: List[Brokers], resp.bid_brokers: List[Brokers]
```

### participants

```python
resp = ctx.participants()      # List[ParticipantInfo]  (HK only)
```

### trades

```python
resp = ctx.trades("700.HK", 50)   # List[Trade], max count=1000
```

### intraday

```python
resp = ctx.intraday("700.HK")                                 # List[IntradayLine]
resp = ctx.intraday("700.HK", TradeSessions.All)              # include pre/post
```

### candlesticks (recent N)

```python
resp = ctx.candlesticks("700.HK", Period.Day, 100, AdjustType.NoAdjust)
resp = ctx.candlesticks("700.HK", Period.Min_5, 200, AdjustType.ForwardAdjust, TradeSessions.All)
# Returns: List[Candlestick]
# Fields: close, open, high, low, volume, turnover, trade_session, timestamp
```

### history_candlesticks_by_offset

```python
# forward=True: query forward from `time`; forward=False: backward
resp = ctx.history_candlesticks_by_offset(
    "700.HK", Period.Day, AdjustType.NoAdjust,
    forward=False, count=100, time=datetime(2024, 1, 1)
)
```

### history_candlesticks_by_date

```python
resp = ctx.history_candlesticks_by_date(
    "700.HK", Period.Day, AdjustType.ForwardAdjust,
    start=date(2024, 1, 1), end=date(2024, 12, 31)
)
```

## Options

```python
dates = ctx.option_chain_expiry_date_list("AAPL.US")    # List[date]
strikes = ctx.option_chain_info_by_date("AAPL.US", date(2024, 1, 19))
# List[StrikePriceInfo]: price, call_symbol, put_symbol, standard
```

## Warrants

```python
issuers = ctx.warrant_issuers()  # List[IssuerInfo]

resp = ctx.warrant_list(
    "700.HK",
    sort_by=WarrantSortBy.LastDone,
    sort_order=SortOrderType.Ascending,
    warrant_type=[WarrantType.Call],     # optional filters
)  # List[WarrantInfo]
```

## Trading Calendar

```python
sessions = ctx.trading_session()   # List[MarketTradingSession]
days = ctx.trading_days(Market.HK, date(2024, 1, 1), date(2024, 3, 31))
# MarketTradingDays: trading_days: List[date], half_trading_days: List[date]
# Constraint: interval < 1 month, only last year supported
```

## Capital & Indexes

```python
flow = ctx.capital_flow("700.HK")          # List[CapitalFlowLine]
dist = ctx.capital_distribution("700.HK")  # CapitalDistributionResponse

indexes = ctx.calc_indexes(
    ["700.HK", "AAPL.US"],
    [CalcIndex.LastDone, CalcIndex.PeTtmRatio, CalcIndex.PbRatio, CalcIndex.TotalMarketValue]
)  # List[SecurityCalcIndex]
```

## Watchlist

```python
groups = ctx.watchlist()   # List[WatchlistGroup]

group_id = ctx.create_watchlist_group("My Group", securities=["700.HK", "AAPL.US"])

ctx.update_watchlist_group(
    group_id,
    name="Updated Name",
    securities=["TSLA.US"],
    mode=SecuritiesUpdateMode.Add    # Add | Remove | Replace
)

ctx.delete_watchlist_group(group_id, purge=False)
```

## Security List & Market Temperature

```python
securities = ctx.security_list(Market.HK)                                   # List[Security]
securities = ctx.security_list(Market.US, SecurityListCategory.Overnight)

temp = ctx.market_temperature(Market.HK)          # MarketTemperature: temperature (0-100)
hist = ctx.history_market_temperature(            # HistoryMarketTemperatureResponse
    Market.HK, date(2024, 1, 1), date(2024, 3, 31)
)
```

## Realtime Cache (after subscribe)

These return data from the local push cache without making a network call:

```python
ctx.subscribe(["700.HK"], [SubType.Quote, SubType.Depth, SubType.Brokers, SubType.Trade])
from time import sleep; sleep(2)

quotes   = ctx.realtime_quote(["700.HK"])          # List[RealtimeQuote]
depth    = ctx.realtime_depth("700.HK")            # SecurityDepth
brokers  = ctx.realtime_brokers("700.HK")          # SecurityBrokers
trades   = ctx.realtime_trades("700.HK", 100)      # List[Trade]
candles  = ctx.realtime_candlesticks("AAPL.US", Period.Min_1, 50)  # List[Candlestick]
```

## Filings

```python
items = ctx.filings("700.HK")   # List of filing objects
# Each item: symbol, name, title, lang, type, url, published_at
```

## Account Info

```python
member_id = ctx.member_id()                    # int
level     = ctx.quote_level()                  # str (e.g. "2")
packages  = ctx.quote_package_details()        # List[QuotePackageDetail]
```


---
<!-- trade-context.md -->

# Python SDK — TradeContext

`TradeContext` (sync) / `AsyncTradeContext` (async) — order management, positions, account.

## Creation

```python
# Sync
ctx = TradeContext(config)

# Async
ctx = AsyncTradeContext.create(config)
```

## Order Push

```python
def on_order_changed(event: PushOrderChanged):
    print(event.symbol, event.status, event.filled_qty)

ctx.set_on_order_changed(on_order_changed)
ctx.subscribe([TopicType.Private])    # start receiving push
ctx.unsubscribe([TopicType.Private])
```

## Submit Order

```python
from decimal import Decimal
from longbridge.openapi import TradeContext, Config, OrderSide, OrderType, TimeInForceType

ctx = TradeContext(config)

resp = ctx.submit_order(
    symbol="700.HK",
    order_type=OrderType.LO,
    side=OrderSide.Buy,
    submitted_quantity=Decimal(200),
    time_in_force=TimeInForceType.Day,
    submitted_price=Decimal("50.00"),  # required for LO/ELO/ALO/ODD
    remark="my order",                 # optional, max 64 chars
)
# resp.order_id: str
```

**Optional parameters by order type:**

| Parameter | Required for |
|-----------|-------------|
| `submitted_price` | LO, ELO, ALO, ODD, LIT |
| `trigger_price` | LIT, MIT |
| `limit_offset` | TSLPAMT, TSLPPCT |
| `trailing_amount` | TSLPAMT |
| `trailing_percent` | TSLPPCT |
| `expire_date` | GTD time_in_force |
| `outside_rth` | US only: `OutsideRTH.RTHOnly / AnyTime / Overnight` |

## Replace / Cancel Order

```python
ctx.replace_order(
    order_id="709043056541253632",
    quantity=Decimal(100),
    price=Decimal("100.00"),
)

ctx.cancel_order("709043056541253632")
```

## Query Orders

```python
# Today's orders
orders = ctx.today_orders(
    symbol="700.HK",                              # optional
    status=[OrderStatus.Filled, OrderStatus.New], # optional
    side=OrderSide.Buy,                           # optional
    market=Market.HK,                             # optional
    order_id="123456",                            # optional
)  # List[Order]

# Historical orders (no today)
orders = ctx.history_orders(
    symbol="700.HK",
    status=[OrderStatus.Filled],
    side=OrderSide.Buy,
    market=Market.HK,
    start_at=datetime(2024, 1, 1),
    end_at=datetime(2024, 12, 31),
)  # List[Order]

# Order detail (includes charge breakdown)
detail = ctx.order_detail("701276261045858304")  # OrderDetail
```

**Order fields:** `order_id`, `symbol`, `order_type`, `side`, `status`, `submitted_quantity`,
`submitted_price`, `executed_qty`, `executed_price`, `submitted_at`, `updated_at`, `tag`,
`time_in_force`, `expire_date`, `outside_rth`, `remark`

## Executions

```python
# Today's fills
execs = ctx.today_executions(symbol="700.HK", order_id=None)  # List[Execution]

# Historical fills
execs = ctx.history_executions(
    symbol="700.HK",
    start_at=datetime(2024, 1, 1),
    end_at=datetime(2024, 12, 31),
)  # List[Execution]
# Execution fields: order_id, trade_id, symbol, trade_done_at, quantity, price
```

## Account Balance

```python
balances = ctx.account_balance()              # List[AccountBalance]
balances = ctx.account_balance("HKD")        # filter by currency

# AccountBalance fields:
# currency, total_cash, max_finance_amount, remaining_finance_amount,
# risk_level, margin_call, net_assets, buy_power, cash_infos: List[CashInfo]
```

## Cash Flow

```python
flows = ctx.cash_flow(
    start_at=datetime(2024, 1, 1),
    end_at=datetime(2024, 12, 31),
    business_type=BalanceType.Cash,  # optional: Cash | Stock | Fund
    symbol="700.HK",                 # optional
    page=1,                          # optional, default 1
    size=50,                         # optional, default 50
)  # List[CashFlow]
```

## Positions

```python
stock_pos = ctx.stock_positions()                       # StockPositionsResponse
stock_pos = ctx.stock_positions(symbols=["700.HK"])     # filter

fund_pos  = ctx.fund_positions()                        # FundPositionsResponse
fund_pos  = ctx.fund_positions(symbols=["HK123"])
```

**StockPositionsResponse:** `.channels: List[StockPositionChannel]`
Each channel: `account_channel`, `positions: List[StockPosition]`

**StockPosition fields:** `symbol`, `symbol_name`, `quantity`, `available_quantity`,
`currency`, `cost_price`, `market`, `init_quantity`

## Margin & Estimation

```python
ratio = ctx.margin_ratio("TSLA.US")   # MarginRatio
# Fields: im_factor (initial), mm_factor (maintenance), fm_factor (forced liq.)

est = ctx.estimate_max_purchase_quantity(
    symbol="700.HK",
    order_type=OrderType.LO,
    side=OrderSide.Buy,
    price=Decimal("50.00"),
    currency="HKD",          # optional
    fractional_shares=False, # optional
)  # EstimateMaxPurchaseQuantityResponse
# Fields: cash_max_qty, margin_max_qty
```

## Async Example (FastAPI / asyncio)

```python
import asyncio
from decimal import Decimal
from longbridge.openapi import OAuthBuilder, Config, AsyncTradeContext, OrderSide, OrderType, TimeInForceType

async def main():
    oauth = await OAuthBuilder("your-client-id").build_async(
        lambda url: print("Visit:", url)
    )
    config = Config.from_oauth(oauth)
    ctx = AsyncTradeContext.create(config)

    resp = await ctx.submit_order(
        symbol="700.HK",
        order_type=OrderType.LO,
        side=OrderSide.Buy,
        submitted_quantity=Decimal(100),
        time_in_force=TimeInForceType.Day,
        submitted_price=Decimal("50.00"),
    )
    print(resp.order_id)

asyncio.run(main())
```


---
<!-- types.md -->

# Python SDK — Types & Enums

All types imported from `longbridge.openapi`.

## SubType — Quote subscription flags

```python
SubType.Quote    # Real-time quote (price, volume)
SubType.Depth    # Level 2 order book
SubType.Brokers  # HK broker queue
SubType.Trade    # Tick-by-tick trades
```

## Period — Candlestick periods

```python
Period.Min_1    Period.Min_2    Period.Min_3
Period.Min_5    Period.Min_10   Period.Min_15
Period.Min_20   Period.Min_30   Period.Min_45
Period.Min_60   Period.Min_120  Period.Min_180   Period.Min_240
Period.Day      Period.Week     Period.Month
Period.Quarter  Period.Year
```

## AdjustType

```python
AdjustType.NoAdjust       # Actual (unadjusted)
AdjustType.ForwardAdjust  # Forward-adjusted for splits/dividends
```

## TradeSessions

```python
TradeSessions.Intraday   # Regular trading hours only (default)
TradeSessions.All        # All sessions (pre, intraday, post, overnight)
```

## Market

```python
Market.HK   # Hong Kong
Market.US   # United States
Market.CN   # China (SH/SZ)
Market.SG   # Singapore
```

## OrderSide

```python
OrderSide.Buy
OrderSide.Sell
```

## OrderType

```python
OrderType.LO       # Limit Order (price required)
OrderType.ELO      # Enhanced Limit Order (HK only)
OrderType.MO       # Market Order
OrderType.AO       # At-Auction Order
OrderType.ALO      # At-Auction Limit Order
OrderType.ODD      # Odd Lots Order
OrderType.LIT      # Limit If Touched (price + trigger_price)
OrderType.MIT      # Market If Touched (trigger_price)
OrderType.TSLPAMT  # Trailing Limit If Touched (Trailing Amount)
OrderType.TSLPPCT  # Trailing Limit If Touched (Trailing Percent)
OrderType.TSMAMT   # Trailing Market If Touched (Trailing Amount)
OrderType.TSMPCT   # Trailing Market If Touched (Trailing Percent)
OrderType.SLO      # Special Limit Order (HK only, no replace)
```

## OrderStatus

```python
OrderStatus.NotReported          # Pending broker submission
OrderStatus.New                  # Accepted by exchange
OrderStatus.WaitToNew            # In transit to exchange
OrderStatus.PartialFilled        # Partially executed
OrderStatus.Filled               # Fully executed
OrderStatus.WaitToReplace        # Replace request in transit
OrderStatus.PendingReplace       # Replace pending on exchange
OrderStatus.Replaced             # Successfully replaced
OrderStatus.WaitToCancel         # Cancel request in transit
OrderStatus.PendingCancel        # Cancel pending on exchange
OrderStatus.Rejected             # Rejected
OrderStatus.Canceled             # Canceled
OrderStatus.Expired              # Expired
OrderStatus.PartialWithdrawal    # Partially canceled
```

## TimeInForceType

```python
TimeInForceType.Day              # Valid today only
TimeInForceType.GoodTilCanceled  # GTC
TimeInForceType.GoodTilDate      # GTD — requires expire_date
```

## OutsideRTH (US only)

```python
OutsideRTH.RTHOnly    # Regular trading hours only (default)
OutsideRTH.AnyTime    # Pre and post market allowed
OutsideRTH.Overnight  # Overnight session
```

## TopicType (trade push)

```python
TopicType.Private   # Order change notifications
```

## CalcIndex — Financial indexes

```python
# Price & volume
CalcIndex.LastDone           CalcIndex.ChangeValue       CalcIndex.ChangeRate
CalcIndex.Volume             CalcIndex.Turnover          CalcIndex.Amplitude
CalcIndex.VolumeRatio        CalcIndex.TurnoverRate      CalcIndex.TotalMarketValue
CalcIndex.CapitalFlow        CalcIndex.YtdChangeRate

# Period returns
CalcIndex.FiveDayChangeRate  CalcIndex.TenDayChangeRate
CalcIndex.HalfYearChangeRate CalcIndex.FiveMinutesChangeRate

# Valuation
CalcIndex.PeTtmRatio         CalcIndex.PbRatio           CalcIndex.DividendRatioTtm

# Options / Warrants
CalcIndex.ExpiryDate         CalcIndex.StrikePrice       CalcIndex.UpperStrikePrice
CalcIndex.LowerStrikePrice   CalcIndex.OutstandingQty    CalcIndex.OutstandingRatio
CalcIndex.Premium            CalcIndex.ItmOtm            CalcIndex.ImpliedVolatility
CalcIndex.WarrantDelta       CalcIndex.CallPrice         CalcIndex.ToCallPrice
CalcIndex.EffectiveLeverage  CalcIndex.LeverageRatio     CalcIndex.ConversionRatio
CalcIndex.BalancePoint       CalcIndex.OpenInterest
CalcIndex.Delta              CalcIndex.Gamma             CalcIndex.Theta
CalcIndex.Vega               CalcIndex.Rho
```

## SecuritiesUpdateMode (watchlist)

```python
SecuritiesUpdateMode.Add      # Append securities
SecuritiesUpdateMode.Remove   # Remove securities
SecuritiesUpdateMode.Replace  # Replace all securities
```

## SecurityListCategory

```python
SecurityListCategory.Overnight  # Overnight-eligible securities
```

## BalanceType (cash flow)

```python
BalanceType.Cash   # Cash transactions
BalanceType.Stock  # Stock transactions
BalanceType.Fund   # Fund transactions
```

## WarrantSortBy / SortOrderType

```python
WarrantSortBy.LastDone   WarrantSortBy.ChangeRate  WarrantSortBy.Volume
WarrantSortBy.Price      WarrantSortBy.Premium     WarrantSortBy.Leverage
# ... and more

SortOrderType.Ascending
SortOrderType.Descending
```

## Push Types

| Class | Carrier | Fields |
|-------|---------|--------|
| `PushQuote` | `set_on_quote` | `last_done`, `open`, `high`, `low`, `volume`, `turnover`, `trade_session` |
| `PushDepth` | `set_on_depth` | `asks: List[Depth]`, `bids: List[Depth]` |
| `PushBrokers` | `set_on_brokers` | `ask_brokers: List[Brokers]`, `bid_brokers: List[Brokers]` |
| `PushTrades` | `set_on_trades` | `trades: List[Trade]` |
| `PushCandlestick` | `set_on_candlestick` | `candlestick: Candlestick`, `period: Period` |
| `PushOrderChanged` | `set_on_order_changed` | `order_id`, `symbol`, `status`, `side`, `filled_qty`, `price`, `msg` |

## Error Handling

```python
from longbridge.openapi import OpenApiException, ErrorKind

try:
    resp = ctx.quote(["INVALID.XX"])
except OpenApiException as e:
    print(e.kind)       # ErrorKind.Http | ErrorKind.OpenApi | ErrorKind.Other
    print(e.code)       # API error code (int)
    print(e.message)    # Human-readable message
    print(e.trace_id)   # Request trace ID for support
```


---
<!-- content-context.md -->

# Python SDK — ContentContext

`ContentContext` (sync) / `AsyncContentContext` (async) — news and discussion topics for securities.

## Creation

```python
from longbridge.openapi import ContentContext, AsyncContentContext, Config

# Sync
ctx = ContentContext(config)

# Async
ctx = AsyncContentContext.create(config)
```

## Methods

### news

Get news articles for a symbol.

```python
items = ctx.news("700.HK")   # List[NewsItem]
# Fields: id, title, description, url, published_at,
#         likes_count, comments_count, shares_count
```

### topics

Get discussion topics (community posts) for a symbol.

```python
items = ctx.topics("700.HK")   # List[TopicItem]
# Fields: id, title, description, url, published_at,
#         likes_count, comments_count, shares_count
```

## Async Example

```python
import asyncio
from longbridge.openapi import AsyncContentContext, Config

async def main():
    config = Config.from_apikey_env()
    ctx = AsyncContentContext.create(config)

    news = await ctx.news("700.HK")
    for item in news:
        print(item.title, item.published_at)

    topics = await ctx.topics("AAPL.US")
    for item in topics:
        print(item.title, item.likes_count)

asyncio.run(main())
```

## Sync Example

```python
from longbridge.openapi import ContentContext, Config

config = Config.from_apikey_env()
ctx = ContentContext(config)

news = ctx.news("700.HK")
for item in news:
    print(item.title, item.url)
```
