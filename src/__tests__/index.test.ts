import { beforeEach, describe, expect, it } from "vitest";
import OrderBook from "../model/OrderBook.js";
import type { LimitQuote } from "../types/index.js";

const EXTERNAL_ORDERS: LimitQuote[] = [
	{
		type: "limit",
		side: "ask",
		quantity: 2,
		price: 102,
	},
	{
		type: "limit",
		side: "bid",
		quantity: 2,
		price: 98,
	},
];

describe("LimitOrderBook", () => {
	let orderBook: OrderBook;

	beforeEach(() => {
		let counter = 0;
		orderBook = new OrderBook({ idGenerator: () => String(++counter) });
		const limitOrders: Array<LimitQuote> = [
			{
				type: "limit",
				side: "ask",
				quantity: 2,
				price: 105,
			},
			{
				type: "limit",
				side: "bid",
				quantity: 2,
				price: 95,
			},
		];

		for (const order of limitOrders) {
			orderBook.processOrder(order);
		}
	});

	it("Should throw an error when purchasing 0 quantity", () => {
		expect(() =>
			orderBook.processOrder({
				type: "limit",
				side: "ask",
				quantity: 0,
				price: 105,
			}),
		).toThrow("quantity must be greater than 0");
	});

	it("Should throw an error when type is not 'market' or 'limit'", () => {
		expect(() =>
			orderBook.processOrder({
				type: "ERROR",
				side: "bid",
				quantity: 10,
				price: 105,
			} as any),
		).toThrow("orderType for processOrder() is neither 'market' or 'limit'");
	});

	it("Should throw an error when side is not 'bid' or 'ask'", () => {
		expect(() =>
			orderBook.processOrder({
				type: "limit",
				side: "ERROR",
				quantity: 10,
				price: 105,
			} as any),
		).toThrow('processLimitOrder() given neither "bid" nor "ask"');
	});

	it("Should properly show the best and worst Bids and Asks", () => {
		expect(orderBook.getBestBid()).toBe(95);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(105);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully add 1 normal limit order each for Bids and Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully purchase 1 quantity of 102", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 1,
			price: 102,
		});

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(1);
		expect(trades[0].party1.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1.quantity).toBe(1); // bought 1 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully purchase full 2 quantities of 102", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 2,
			price: 102,
		});

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1.quantity).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(105);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully overbuy 2 normal limit order and add remaining 4 to Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 6,
			price: 102,
		});

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1.quantity).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(102); // remaining 4 bids from the latest transactions
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(105);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully overbuy the full Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 4,
			price: 120,
		});

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1.quantity).toBe(2); // bought 2 item

		expect(trades[1].price).toBe(105);
		expect(trades[1].quantity).toBe(2);
		expect(trades[1].party1.orderId).toBe("1"); // bought from orderId 1
		expect(trades[1].party1.quantity).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(null);
		expect(orderBook.getWorstAsk()).toBe(null);
	});

	it("Should successfully overbuy the full Asks and add remaining 4 to Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 6,
			price: 120,
		});

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(102);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1.quantity).toBe(2); // bought 2 item

		expect(trades[1].price).toBe(105);
		expect(trades[1].quantity).toBe(2);
		expect(trades[1].party1.orderId).toBe("1"); // bought from orderId 1
		expect(trades[1].party1.quantity).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(120);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(null);
		expect(orderBook.getWorstAsk()).toBe(null);
	});

	it("Should successfully sell 1 quantity of 98", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 1,
			price: 98,
		});

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(1);
		expect(trades[0].party1.orderId).toBe("4"); // sold to 4
		expect(trades[0].party1.quantity).toBe(1); // sold 1 item

		expect(orderBook.getBestBid()).toBe(98);
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully sell full 2 quantity of 98", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 2,
			price: 98,
		});

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1.orderId).toBe("4"); // sold to 4
		expect(trades[0].party1.quantity).toBe(2); // sold 2 item

		expect(orderBook.getBestBid()).toBe(95); // bought all 98
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully oversell 2 normal limit order and add remaining 4 to Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 6,
			price: 98,
		});

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1.orderId).toBe("4"); // sold to orderId 4
		expect(trades[0].party1.quantity).toBe(2); // sold 2 item

		expect(orderBook.getBestBid()).toBe(95); // bought all 98
		expect(orderBook.getWorstBid()).toBe(95);
		expect(orderBook.getBestAsk()).toBe(98);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully oversell the full Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 4,
			price: 90,
		});

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1.orderId).toBe("4"); // sold to orderId 3
		expect(trades[0].party1.quantity).toBe(2); // bought 2 item

		expect(trades[1].price).toBe(95);
		expect(trades[1].quantity).toBe(2);
		expect(trades[1].party1.orderId).toBe("2"); // sold to orderId 2
		expect(trades[1].party1.quantity).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(null);
		expect(orderBook.getWorstBid()).toBe(null);
		expect(orderBook.getBestAsk()).toBe(102);
		expect(orderBook.getWorstAsk()).toBe(105);
	});

	it("Should successfully overbuy the full Bids and add remaining 4 to Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 6,
			price: 90,
		});

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(98);
		expect(trades[0].quantity).toBe(2);
		expect(trades[0].party1.orderId).toBe("4"); // sold to orderId 3
		expect(trades[0].party1.quantity).toBe(2); // bought 2 item

		expect(trades[1].price).toBe(95);
		expect(trades[1].quantity).toBe(2);
		expect(trades[1].party1.orderId).toBe("2"); // sold to orderId 2
		expect(trades[1].party1.quantity).toBe(2); // bought 2 item

		expect(orderBook.getBestBid()).toBe(null);
		expect(orderBook.getWorstBid()).toBe(null);
		expect(orderBook.getBestAsk()).toBe(90);
		expect(orderBook.getWorstAsk()).toBe(105);
	});
});
