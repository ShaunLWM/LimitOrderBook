import OrderBook from "./model/OrderBook";

function assert<T>(title: string, current: T, expected: T) {
	if (current !== expected) {
		return console.log(`[❌ ${title}] Expected ${expected}, but got ${current}`);
	}

	return console.log(`[✅ ${title}] ${current} === ${expected}`);
}

const orderBook = new OrderBook();
// orderBook.on("transaction:new", (data) => {
// 	console.log(`transaction`);
// 	console.log(data);
// });

// orderBook.on("order:new", (data) => {
// 	console.log(`new order`);
// 	console.log(data);
// });

// orderBook.on("price:new", (data) => {
// 	console.log(`new price`);
// 	console.log(data);
// });

const limitOrders: Array<Quote> = [
	{
		type: "limit",
		side: "bid",
		quantity: 5,
		price: 99,
		tradeId: 104,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "bid",
		quantity: 3,
		price: 100,
		tradeId: 100,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "bid",
		quantity: 6,
		price: 98,
		tradeId: 105,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "bid",
		quantity: 7,
		price: 99,
		tradeId: 106,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "bid",
		quantity: 8,
		price: 97,
		tradeId: 107,
		timestamp: -1,
		orderId: -1,
	},

	{
		type: "limit",
		side: "ask",
		quantity: 1,
		price: 101,
		tradeId: 100,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "ask",
		quantity: 2,
		price: 103,
		tradeId: 101,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "ask",
		quantity: 3,
		price: 101,
		tradeId: 102,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "ask",
		quantity: 4,
		price: 101,
		tradeId: 103,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "ask",
		quantity: 1,
		price: 102,
		tradeId: 104,
		timestamp: -1,
		orderId: -1,
	},
];

/**
 * ----Ask ----
 * 103 x2 (101)
 * 101 x1 (100), 101 x3 (102), 101 x4 (103)
 * ----Bid ----
 * 100 x3 (100),
 * 99 x5 (104), 99 * 7 (106),
 * 98 x6 (105),
 * 97 x8 (107),
 * */

for (const order of limitOrders) {
	orderBook.processOrder(order, false);
}

console.log(`${orderBook}`);
assert('Best bid', orderBook.getBestBid(), 100);
assert('Worst bid', orderBook.getWorstBid(), 97)
assert('Best ask', orderBook.getBestAsk(), 101)
assert('Worst ask', orderBook.getWorstAsk(), 103)

const crossLimitOrder: Quote = {
	type: "limit",
	side: "bid",
	quantity: 8,
	price: 102,
	tradeId: 109,
	timestamp: -1,
	orderId: -1,
};

console.log(`----------BUY ORDER SAMPLE (crossLimitOrder)-----------`);
let { trades } = orderBook.processOrder(crossLimitOrder, false);
// console.log(trades);

if (!trades) {
	throw new Error('Impossible. There should be trade');
}

assert('Total transaction', trades.length, 3);

assert('1st Transaction (price)', trades[0].price, 101);
assert('1st Transaction (bought from)', trades[0].party1![0], 100);
assert('1st Transaction (quantity)', trades[0].party1![3], 1); // bought 1 from tradeId 100

assert('2nd Transaction (price)', trades[1].price, 101);
assert('2nd Transaction (bought from)', trades[1].party1![0], 102);
assert('2nd Transaction (quantity)', trades[1].party1![3], 3); // bought 3 from tradeId 102 since 100 only has 1

assert('3rd Transaction (price)', trades[2].price, 101);
assert('3rd Transaction (bought from)', trades[2].party1![0], 103);
assert('3rd Transaction (quantity)', trades[2].party1![3], 4); // bought 4 from tradeId 102 and finished up price at 101

console.log(`\n\n----------ORDER BOOK RESULT-------------`);
console.log(`${orderBook}`);

assert('Best bid (no change)', orderBook.getBestBid(), 100);
assert('Worst bid (no change)', orderBook.getWorstBid(), 97)
assert('Best ask', orderBook.getBestAsk(), 102) // bought up all 101, so left 102
assert('Worst ask', orderBook.getWorstAsk(), 103)

process.exit(0);

const bigCrossingLimitOrder: Quote = {
	type: "limit",
	side: "bid",
	quantity: 50,
	price: 102,
	tradeId: 110,
	timestamp: -1,
	orderId: -1,
};

console.log(`----------BUY ORDER SAMPLE (bigCrossingLimitOrder)-----------`);
let result = orderBook.processOrder(bigCrossingLimitOrder, false);
//console.log(result);
console.log(`----------ORDER BOOK RESULT-------------`);
console.log(`${orderBook}`);

const marketOrder: Quote = {
	type: "market",
	side: "ask",
	quantity: 40,
	tradeId: 111,
	price: 0,
	orderId: -1,
	timestamp: -1,
};

console.log(`----------SELL ORDER SAMPLE (marketOrder)-----------`);
result = orderBook.processOrder(marketOrder, false);
console.log(result);
console.log(`----------ORDER BOOK RESULT-------------`);
console.log(`${orderBook}`);
