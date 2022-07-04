import OrderBook from "../model/OrderBook";

const EXTERNAL_ORDERS: Quote[] = [
	{
		type: "limit",
		side: "bid",
		quantity: 2,
		price: 98,
		tradeId: "3",
		timestamp: -1,
		orderId: -1,
	},
	{
		type: "limit",
		side: "ask",
		quantity: 2,
		price: 102,
		tradeId: "4",
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
				tradeId: "1",
				timestamp: -1,
				orderId: -1,
			},
			{
				type: "limit",
				side: "bid",
				quantity: 2,
				price: 95,
				tradeId: "2",
				timestamp: -1,
				orderId: -1,
			},
		];

		for (const order of limitOrders) {
			orderBook.processOrder(order, false);
		}
	});

	it("Should properly show the best and worst Bids and Asks", () => {
		expect(orderBook.getBestBid()).toBe(95);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(105);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully add 1 normal limit order each for Bids and Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully purchase 1 quantity of 102", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 1,
			price: 102,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash"); 1
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(1);
		expect(trades[0].party1![0]).toBe("4"); // bought from tradeId 4
		expect(trades[0].party1![3]).toBe(1); // bought 1 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully purchase full 2 quantities of 102", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 2,
			price: 102,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash"); 1
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe("4"); // bought from tradeId 4
		expect(trades[0].party1![3]).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(105);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully overbuy 2 normal limit order and add remaining 4 to Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 6,
			price: 102,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe("4"); // bought from tradeId 4
		expect(trades[0].party1![3]).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(102); // remaining 4 bids from the latest transactions
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(105);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully overbuy the full Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 4,
			price: 120,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe("4"); // bought from tradeId 4
		expect(trades[0].party1![3]).toBe(2); // bought 2 item

		expect(trades[1].price).toBe(105);
		expect(trades[1].quantity).toBe(2);
		expect(trades[1].party1![0]).toBe("1"); // bought from tradeId 1
		expect(trades[1].party1![3]).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(null);
		expect(orderBook.getWorstAsk()).toBe(null);
	});

	it("Should successfully overbuy the full Asks and add remaining 4 to Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 6,
			price: 120,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe("4"); // bought from tradeId 4
		expect(trades[0].party1![3]).toBe(2); // bought 2 item

		expect(trades[1].price).toBe(105);
		expect(trades[1].quantity).toBe(2);
		expect(trades[1].party1![0]).toBe("1"); // bought from tradeId 1
		expect(trades[1].party1![3]).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(120);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(null);
		expect(orderBook.getWorstAsk()).toBe(null);
	});

	it("Should successfully sell 1 quantity of 98", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 1,
			price: 98,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash"); 1
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(1);
		expect(trades[0].party1![0]).toBe("3"); // sold to 3
		expect(trades[0].party1![3]).toBe(1); // sold 1 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully sell full 2 quantity of 98", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 2,
			price: 98,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash"); 1
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe("3"); // sold to 3
		expect(trades[0].party1![3]).toBe(2); // sold 2 item

		expect(orderBook.getBestBid()).toBe(95); // bought all 98
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully oversell 2 normal limit order and add remaining 4 to Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 6,
			price: 98,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe("3"); // sold to tradeId 3
		expect(trades[0].party1![3]).toBe(2); // sold 2 item

		expect(orderBook.getBestBid()).toBe(95); // bought all 98
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(98);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully oversell the full Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 4,
			price: 90,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe("3"); // sold to tradeId 3
		expect(trades[0].party1![3]).toBe(2); // bought 2 item

		expect(trades[1].price).toBe(95);
		expect(trades[1].quantity).toBe(2);
		expect(trades[1].party1![0]).toBe("2"); // sold to tradeId 2
		expect(trades[1].party1![3]).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(null);
		expect(orderBook.getWorstBid()).toBe(null);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully overbuy the full Bids and add remaining 4 to Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order, false);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 6,
			price: 90,
			tradeId: "110",
			timestamp: -1,
			orderId: -1,
		}, false);

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1![0]).toBe("3"); // sold to tradeId 3
		expect(trades[0].party1![3]).toBe(2); // bought 2 item

		expect(trades[1].price).toBe(95);
		expect(trades[1].quantity).toBe(2);
		expect(trades[1].party1![0]).toBe("2"); // sold to tradeId 2
		expect(trades[1].party1![3]).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(null);
		expect(orderBook.getWorstBid()).toBe(null);
		expect(orderBook.getBestAsk()).toBe(90);
		expect(orderBook.getWorstAsk()).toBe(105);
	});
});