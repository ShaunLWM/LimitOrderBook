[![npm](https://img.shields.io/npm/dt/lob.js.svg)](https://github.com/ShaunLWM/lob.js/releases)
[![npm](https://img.shields.io/npm/v/lob.js.svg)](https://www.npmjs.com/package/lob.js)

# lob.js

A high-performance Limit Order Book for TypeScript/JavaScript.

Ported from [OrderBook](https://github.com/dyn4mik3/OrderBook), rewritten with a B+ tree core, native number arithmetic, and optional event emission.

## Install

```sh
pnpm add lob.js
```

## Usage

```typescript
import { OrderBook } from "lob.js";

const book = new OrderBook();

// Add a limit order
const { trades, orderInBook } = book.processOrder({
  type: "limit",
  side: "bid",
  quantity: 5,
  price: 100.50,
});

// Add a market order
const { trades: marketTrades } = book.processOrder({
  type: "market",
  side: "ask",
  quantity: 3,
});

// Cancel an order
book.cancelOrder("bid", orderInBook.orderId);

// Modify an existing order
book.modifyOrder(orderInBook.orderId, {
  type: "limit",
  side: "bid",
  quantity: 10,
  price: 101.00,
  orderId: orderInBook.orderId,
  time: Date.now(),
});

// Query the book
book.getBestBid();   // highest bid price
book.getBestAsk();   // lowest ask price
book.getSimpleBook(); // { bids: [{ price, volume }], asks: [{ price, volume }] }
book.getVolumeAtPrice("bid", 100.50);
```

## Options

```typescript
const book = new OrderBook({
  enableEvents: false,    // disable events for max performance (default: true)
  idGenerator: () => myCustomId(), // custom ID generator (default: monotonic counter)
});
```

### `enableEvents`

When `true` (default), the order book emits events via EventEmitter2. Set to `false` to skip all event overhead — useful for high-frequency scenarios like backtesting or simulation.

### `idGenerator`

By default, order and transaction IDs are generated using a fast monotonic counter (`"1"`, `"2"`, `"3"`, ...). Provide a custom function to use UUIDs, snowflake IDs, or any other scheme:

```typescript
import { randomUUID } from "node:crypto";

const book = new OrderBook({
  idGenerator: () => randomUUID(),
});
```

## Events

Events are emitted when `enableEvents` is `true`:

| Event | Payload | Description |
|---|---|---|
| `order:new` | `Quote` | New order added to the book |
| `order:update` | `Quote` | Existing order modified |
| `order:remove` | `Order` | Order removed from the book |
| `price:new` | `{ price }` | New price level created |
| `price:remove` | `{ price }` | Price level removed (no more orders) |
| `transaction:new` | `TransactionRecord` | Trade executed |

```typescript
book.on("transaction:new", (trade) => {
  console.log(`Trade: ${trade.quantity}@${trade.price}`);
});

book.onAny((event, data) => {
  console.log(event, data);
});
```

## API

| Method | Returns | Description |
|---|---|---|
| `processOrder(quote)` | `{ trades, orderInBook }` | Submit a limit or market order |
| `cancelOrder(side, orderId)` | `void` | Cancel an order by side and ID |
| `modifyOrder(orderId, quote)` | `void` | Modify an existing order |
| `getBestBid()` | `number \| null` | Highest bid price |
| `getBestAsk()` | `number \| null` | Lowest ask price |
| `getWorstBid()` | `number \| null` | Lowest bid price |
| `getWorstAsk()` | `number \| null` | Highest ask price |
| `getVolumeAtPrice(side, price)` | `number` | Total volume at a price level |
| `getSimpleBook()` | `SimpleBook` | Aggregated bids and asks |
| `toString()` | `string` | Human-readable book state |

## Types

```typescript
import type {
  OrderBook,
  OrderBookOptions,
  IdGenerator,
  OrderQuote,
  Quote,
  LimitQuote,
  MarketQuote,
  OrderSide,
  OrderType,
  TransactionRecord,
  TransactionPartyDetail,
  SimpleBook,
  SimpleBookRecord,
} from "lob.js";
```

## Performance

Benchmarked on Apple Silicon (Node.js 22):

| Scenario | Ops | Time |
|---|---|---|
| 10K mixed operations | 10,000 | ~5ms |
| 10K insert-only | 10,000 | ~7ms |
| 100K inserts into 50K price levels | 100,000 | ~159ms |
| 500K insert then cancel all | 1,000,000 | ~364ms |
| 1M match-heavy (90% crossing) | 1,000,000 | ~574ms |

Run benchmarks yourself:

```sh
pnpm run bench
```

## Author

**ShaunLWM**

- Website: <https://shaunlwm.me>
- Github: [@ShaunLWM](https://github.com/ShaunLWM)

## License

MIT
