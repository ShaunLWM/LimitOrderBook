# Changelog

## [Unreleased]

### Added

- `getSpread()` — bid-ask spread
- `getMidPrice()` — mid price between best bid and ask
- `getDepth(levels?)` — top N price levels per side (bids descending, asks ascending)
- `getOrder(orderId)` — look up a resting order by ID
- `getOrderCount()` — total resting orders in the book
- `getPriceLevelCount(side?)` — number of distinct price levels
- Time-in-force support for limit orders: `GTC` (default), `IOC`, `FOK`
- JSDoc comments on all public OrderBook methods
- Comprehensive test coverage: API methods, TIF orders, edge cases, events

### Fixed

- `processMarketOrder` infinite loop when order quantity exceeds available liquidity
- `modifyOrder` passing full Quote object to `orderExists` instead of orderId string

### Changed

- `OrderTree.depth` is now a computed getter over `priceMap.size` instead of a manually tracked field

### Removed

- Dead `numOrders` field from `OrderTree` (redundant with `length` getter)
