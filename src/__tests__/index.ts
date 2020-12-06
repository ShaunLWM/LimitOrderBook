import OrderBook from "../model/OrderBook";
import OrderList from "../model/OrderList";
import { SortedDictionary } from "yaca";

// const priceMap = new SortedDictionary<number, OrderList>();
// priceMap.set(1, new OrderList("1"));
// priceMap.set(2, new OrderList("2"));
// console.log(priceMap.get(1));
// process.exit(0);

const orderBook = new OrderBook();
orderBook.on("transaction:new", (data) => {
	console.log(`transaction`);
	console.log(data);
})

orderBook.on("order:new", data => {
	console.log(`new order`);
	console.log(data);
})

orderBook.on("price:new", data => {
	console.log(`new price`);
	console.log(data);
})

const limitOrders: Array<Quote> = [
	{ type: "limit", side: "bid", quantity: 5, price: 99, tradeId: 104, timestamp: -1, orderId: -1 },
	{ type: "limit", side: "bid", quantity: 6, price: 98, tradeId: 105, timestamp: -1, orderId: -1 },
	{ type: "limit", side: "bid", quantity: 7, price: 99, tradeId: 106, timestamp: -1, orderId: -1 },
	{ type: "limit", side: "bid", quantity: 8, price: 97, tradeId: 107, timestamp: -1, orderId: -1 },

	{ type: "limit", side: "ask", quantity: 1, price: 101, tradeId: 100, timestamp: -1, orderId: -1 },
	{ type: "limit", side: "ask", quantity: 2, price: 103, tradeId: 101, timestamp: -1, orderId: -1 },
	{ type: "limit", side: "ask", quantity: 3, price: 101, tradeId: 102, timestamp: -1, orderId: -1 },
	{ type: "limit", side: "ask", quantity: 4, price: 101, tradeId: 103, timestamp: -1, orderId: -1 },
];

for (const order of limitOrders) {
	const result = orderBook.processOrder(order, false);
	//console.log(result);
	//console.log(`		+++ 			`);
}

console.log(`${orderBook}`);

const crossLimitOrder: Quote = {
	type: "limit",
	side: "bid",
	quantity: 2,
	price: 102,
	tradeId: 109,
	timestamp: -1,
	orderId: -1,
};

console.log(`----------BUY ORDER SAMPLE (crossLimitOrder)-----------`);
let result = orderBook.processOrder(crossLimitOrder, false);
// console.log(result);

console.log(`----------ORDER BOOK RESULT-------------`);
console.log(`${orderBook}`);

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
result = orderBook.processOrder(bigCrossingLimitOrder, false);
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
