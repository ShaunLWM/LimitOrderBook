import OrderBook from "../model/OrderBook";


const EXTERNAL_ORDERS: Quote[] = [
	{
		type: "limit",
		side: "bid",
		quantity: 2,
		price: 98,
		tradeId: 3,
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "ask",
		quantity: 2,
		price: 102,
		tradeId: 4,
		timestamp: -1,
		orderId: -1,
	}
]

describe("LimitOrderBook", () => {
	let orderBook: OrderBook;

	beforeEach(() => {
		orderBook = new OrderBook();
		const limitOrders: Array<Quote> = [
			{
				type: "limit",
				side: "ask",
				quantity: 2,
				price: 105,
				tradeId: 1,
				timestamp: -1,
				orderId: -1,
			},
			{
				type: "limit",
				side: "bid",
				quantity: 2,
				price: 95,
				tradeId: 2,
				timestamp: -1,
				orderId: -1,
			},
		];

		for (const order of limitOrders) {
			orderBook.processOrder(order, false);
		}
	});

	it("Should properly show the best and worst bid and ask", () => {
		expect(orderBook.getBestBid()).toBe(95);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(105);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully add 1 normal limit order each for bid and ask", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully purchase 2 quantity of 102", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 2,
			price: 102,
			tradeId: 110,
			timestamp: -1,
			orderId: -1,
		}, false);

		expect(trades!.length).toBe(1);
		if (!trades) {
			throw new Error("Shouldn't crash"); 1
		}

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe(4); // bought from tradeId 4
		expect(trades[0].party1![3]).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(105);
		expect(orderBook.getWorstAsk()).toBe(105);
	});
});