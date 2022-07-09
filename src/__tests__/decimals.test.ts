import OrderBook from "../model/OrderBook";
import * as Helper from "../lib/Helper";

const EXTERNAL_ORDERS: LimitQuote[] = [
	{
		type: "limit",
		side: "ask",
		quantity: 2.83475,
		price: 102.42,
	},
	{
		type: "limit",
		side: "bid",
		quantity: 1.34876,
		price: 98.19,
	},
];

describe("LimitOrderBook (decimals)", () => {
	let orderBook: OrderBook;

	beforeEach(() => {
		const getUniqueIdSpy = jest.spyOn(Helper, 'getUniqueId');
		getUniqueIdSpy.mockReturnValueOnce("1").mockReturnValueOnce("2").mockReturnValueOnce("3").mockReturnValueOnce("4").mockReturnValueOnce("5").mockReturnValueOnce("6").mockReturnValueOnce("7").mockReturnValueOnce("8");

		orderBook = new OrderBook();
		const limitOrders: Array<LimitQuote> = [
			{
				type: "limit",
				side: "ask",
				quantity: 1.90567,
				price: 105.64,
			},
			{
				type: "limit",
				side: "bid",
				quantity: 2.34501,
				price: 95.88,
			},
		];

		for (const order of limitOrders) {
			orderBook.processOrder(order);
		}
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it("Should throw an error when purchasing 0 quantity", () => {
		expect(() => orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 0,
			price: 105,
		})).toThrow("quantity must be greater than 0");
	});

	it("Should throw an error when type is not 'market' or 'limit'", () => {
		expect(() => orderBook.processOrder({
			type: "ERROR",
			side: "bid",
			quantity: 10,
			price: 105,
		} as any)).toThrow("orderType for processOrder() is neither 'market' or 'limit'");
	});

	it("Should throw an error when side is not 'bid' or 'ask'", () => {
		expect(() => orderBook.processOrder({
			type: "limit",
			side: "ERROR",
			quantity: 10,
			price: 105,
		} as any)).toThrow('processLimitOrder() given neither "bid" nor "ask"');
	});

	it("Should properly show the best and worst Bids and Asks", () => {
		expect(orderBook.getBestBid()).toBe(95.88);
		expect(orderBook.getSimpleBids()[0].price).toBe(95.88);
		expect(orderBook.getSimpleBids()[0].volume).toBe(2.34501);
		expect(orderBook.getWorstBid()).toBe(95.88);

		expect(orderBook.getBestAsk()).toBe(105.64);
		expect(orderBook.getSimpleAsks()[0].price).toBe(105.64);
		expect(orderBook.getSimpleAsks()[0].volume).toBe(1.90567);
		expect(orderBook.getWorstAsk()).toBe(105.64);
	});

	it("Should successfully add 1 normal limit order each for Bids and Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		expect(orderBook.getBestBid()).toBe(98.19);
		expect(orderBook.getWorstBid()).toBe(95.88);

		expect(orderBook.getSimpleBids()[0].price).toBe(95.88);
		expect(orderBook.getSimpleBids()[0].volume).toBe(2.34501);
		expect(orderBook.getSimpleBids()[1].price).toBe(98.19);
		expect(orderBook.getSimpleBids()[1].volume).toBe(1.34876);

		expect(orderBook.getBestAsk()).toBe(102.42);
		expect(orderBook.getWorstAsk()).toBe(105.64);

		expect(orderBook.getSimpleAsks()[0].price).toBe(102.42);
		expect(orderBook.getSimpleAsks()[0].volume).toBe(2.83475);
		expect(orderBook.getSimpleAsks()[1].price).toBe(105.64);
		expect(orderBook.getSimpleAsks()[1].volume).toBe(1.90567);
	});

	it("Should successfully purchase 0.57216 of $103.01", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 0.57216,
			price: 103.01,
		});

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102.42);
		expect(trades[0].quantity).toBe(0.57216);
		expect(trades[0].party1!.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1!.quantity).toBe(0.57216); // bought 0.57216 quantity

		// nothing changed for Bids
		expect(orderBook.getBestBid()).toBe(98.19);
		expect(orderBook.getWorstBid()).toBe(95.88);

		expect(orderBook.getSimpleBids()[0].price).toBe(95.88);
		expect(orderBook.getSimpleBids()[0].volume).toBe(2.34501);
		expect(orderBook.getSimpleBids()[1].price).toBe(98.19);
		expect(orderBook.getSimpleBids()[1].volume).toBe(1.34876);

		expect(orderBook.getBestAsk()).toBe(102.42);
		expect(orderBook.getWorstAsk()).toBe(105.64);

		expect(orderBook.getSimpleAsks()[0].price).toBe(102.42);
		expect(orderBook.getSimpleAsks()[0].volume).toBe(2.26259); // original minus purchased
		expect(orderBook.getSimpleAsks()[1].price).toBe(105.64);
		expect(orderBook.getSimpleAsks()[1].volume).toBe(1.90567);
	});

	it("Should successfully purchase full 2.83475 of $102.42", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 2.83475,
			price: 102.42,
		});

		if (!trades) {
			throw new Error("Shouldn't crash"); 1
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102.42);
		expect(trades[0].quantity).toBe(2.83475);
		expect(trades[0].party1!.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1!.quantity).toBe(2.83475); // bought 2.83475 item

		expect(orderBook.getBestBid()).toBe(98.19);
		expect(orderBook.getWorstBid()).toBe(95.88);

		expect(orderBook.getSimpleBids()[0].price).toBe(95.88);
		expect(orderBook.getSimpleBids()[0].volume).toBe(2.34501);
		expect(orderBook.getSimpleBids()[1].price).toBe(98.19);
		expect(orderBook.getSimpleBids()[1].volume).toBe(1.34876);

		expect(orderBook.getBestAsk()).toBe(105.64);
		expect(orderBook.getWorstAsk()).toBe(105.64);

		expect(orderBook.getSimpleAsks().length).toBe(1);
		expect(orderBook.getSimpleAsks()[0].price).toBe(105.64);
		expect(orderBook.getSimpleAsks()[0].volume).toBe(1.90567);
	});

	it("Should successfully overbuy 2.83475 normal limit order and add remaining 3.48986 to Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 6.32461,
			price: 102.42,
		});

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(102.42);
		expect(trades[0].quantity).toBe(2.83475);
		expect(trades[0].party1!.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1!.quantity).toBe(2.83475); // bought 2.83475 item

		expect(orderBook.getBestBid()).toBe(102.42); // remaining bids became a new Bid order
		expect(orderBook.getWorstBid()).toBe(95.88);

		expect(orderBook.getSimpleBids()[0].price).toBe(95.88);
		expect(orderBook.getSimpleBids()[0].volume).toBe(2.34501);
		expect(orderBook.getSimpleBids()[1].price).toBe(98.19);
		expect(orderBook.getSimpleBids()[1].volume).toBe(1.34876);
		expect(orderBook.getSimpleBids()[2].price).toBe(102.42);
		expect(orderBook.getSimpleBids()[2].volume).toBe(3.48986);

		expect(orderBook.getBestAsk()).toBe(105.64); // bought all 102.42, left with 105.64
		expect(orderBook.getWorstAsk()).toBe(105.64);
	});

	it("Should successfully overbuy the full Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 4.74042,
			price: 120.52,
		});

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(102.42);
		expect(trades[0].quantity).toBe(2.83475);
		expect(trades[0].party1!.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1!.quantity).toBe(2.83475); // bought 2.83475 

		expect(trades[1].price).toBe(105.64);
		expect(trades[1].quantity).toBe(1.90567);
		expect(trades[1].party1!.orderId).toBe("1"); // bought from orderId 1
		expect(trades[1].party1!.quantity).toBe(1.90567); // bought 1.90567

		expect(orderBook.getBestBid()).toBe(98.19);
		expect(orderBook.getWorstBid()).toBe(95.88);
		expect(orderBook.getBestAsk()).toBe(null);
		expect(orderBook.getWorstAsk()).toBe(null);
		expect(orderBook.getSimpleAsks().length).toBe(0);
	});

	it("Should successfully overbuy the full Asks and add remaining 4 to Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "bid",
			quantity: 6,
			price: 120.33,
		});

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(102.42);
		expect(trades[0].quantity).toBe(2.83475);
		expect(trades[0].party1!.orderId).toBe("3"); // bought from orderId 3
		expect(trades[0].party1!.quantity).toBe(2.83475); // bought 2.83475 

		expect(trades[1].price).toBe(105.64);
		expect(trades[1].quantity).toBe(1.90567);
		expect(trades[1].party1!.orderId).toBe("1"); // bought from orderId 1
		expect(trades[1].party1!.quantity).toBe(1.90567); // bought 1.90567

		expect(orderBook.getBestBid()).toBe(120.33);
		expect(orderBook.getWorstBid()).toBe(95.88);
		expect(orderBook.getBestAsk()).toBe(null);
		expect(orderBook.getWorstAsk()).toBe(null);
	});

	it("Should successfully sell 0.82565 quantity of $98.19", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 0.82565,
			price: 98.19,
		});

		if (!trades) {
			throw new Error("Shouldn't crash"); 1
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98.19);
		expect(trades[0].quantity).toBe(0.82565);
		expect(trades[0].party1!.orderId).toBe("4"); // sold to 4
		expect(trades[0].party1!.quantity).toBe(0.82565); // sold 0.82565

		expect(orderBook.getBestBid()).toBe(98.19);
		expect(orderBook.getWorstBid()).toBe(95.88);

		expect(orderBook.getSimpleBids().length).toBe(2);
		expect(orderBook.getSimpleBids()[0].price).toBe(95.88);
		expect(orderBook.getSimpleBids()[0].volume).toBe(2.34501);
		expect(orderBook.getSimpleBids()[1].price).toBe(98.19);
		expect(orderBook.getSimpleBids()[1].volume).toBe(0.52311); // remaining

		expect(orderBook.getBestAsk()).toBe(102.42);
		expect(orderBook.getWorstAsk()).toBe(105.64);
	});

	it("Should successfully sell full 1.34876 quantity of $98.19", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 1.34876,
			price: 98.19,
		});

		if (!trades) {
			throw new Error("Shouldn't crash"); 1
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98.19);
		expect(trades[0].quantity).toBe(1.34876);
		expect(trades[0].party1!.orderId).toBe("4"); // sold to 4
		expect(trades[0].party1!.quantity).toBe(1.34876); // sold 1.34876

		expect(orderBook.getBestBid()).toBe(95.88); // bought all 98
		expect(orderBook.getWorstBid()).toBe(95.88);

		expect(orderBook.getSimpleBids().length).toBe(1);
		expect(orderBook.getSimpleBids()[0].price).toBe(95.88);
		expect(orderBook.getSimpleBids()[0].volume).toBe(2.34501);

		expect(orderBook.getBestAsk()).toBe(102.42);
		expect(orderBook.getWorstAsk()).toBe(105.64);
	});

	it("Should successfully oversell 2 normal limit order and add remaining 4 to Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 6,
			price: 98.19,
		});

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(1);

		expect(trades[0].price).toBe(98.19);
		expect(trades[0].quantity).toBe(1.34876);
		expect(trades[0].party1!.orderId).toBe("4"); // sold to orderId 4
		expect(trades[0].party1!.quantity).toBe(1.34876); // sold 2 item

		expect(orderBook.getBestBid()).toBe(95.88); // bought all 98.19
		expect(orderBook.getWorstBid()).toBe(95.88);

		expect(orderBook.getBestAsk()).toBe(98.19);
		expect(orderBook.getWorstAsk()).toBe(105.64);

		expect(orderBook.getSimpleAsks().length).toBe(3);
		expect(orderBook.getSimpleAsks()[0].price).toBe(98.19);
		expect(orderBook.getSimpleAsks()[0].volume).toBe(4.65124);
	});

	it("Should successfully oversell the full Bids", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 3.69377,
			price: 90,
		});

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(98.19);
		expect(trades[0].quantity).toBe(1.34876);
		expect(trades[0].party1!.orderId).toBe("4"); // sold to orderId 3
		expect(trades[0].party1!.quantity).toBe(1.34876); // bought 1.34876

		expect(trades[1].price).toBe(95.88);
		expect(trades[1].quantity).toBe(2.34501);
		expect(trades[1].party1!.orderId).toBe("2"); // sold to orderId 2
		expect(trades[1].party1!.quantity).toBe(2.34501); // bought 2.34501

		expect(orderBook.getBestBid()).toBe(null);
		expect(orderBook.getWorstBid()).toBe(null);
		expect(orderBook.getBestAsk()).toBe(102.42);
		expect(orderBook.getWorstAsk()).toBe(105.64);
	});

	it("Should successfully overbuy the full Bids and add remaining 4 to Asks", () => {
		for (const order of EXTERNAL_ORDERS) {
			orderBook.processOrder(order);
		}

		const { trades } = orderBook.processOrder({
			type: "limit",
			side: "ask",
			quantity: 6,
			price: 90.86,
		});

		if (!trades) {
			throw new Error("Shouldn't crash");
		}

		expect(trades.length).toBe(2);

		expect(trades[0].price).toBe(98.19);
		expect(trades[0].quantity).toBe(1.34876);
		expect(trades[0].party1!.orderId).toBe("4"); // sold to orderId 3
		expect(trades[0].party1!.quantity).toBe(1.34876); // bought 2 item

		expect(trades[1].price).toBe(95.88);
		expect(trades[1].quantity).toBe(2.34501);
		expect(trades[1].party1!.orderId).toBe("2"); // sold to orderId 2
		expect(trades[1].party1!.quantity).toBe(2.34501); // bought 2 item

		expect(orderBook.getBestBid()).toBe(null);
		expect(orderBook.getWorstBid()).toBe(null);
		expect(orderBook.getSimpleBids().length).toBe(0);

		expect(orderBook.getBestAsk()).toBe(90.86);
		expect(orderBook.getWorstAsk()).toBe(105.64);

		expect(orderBook.getSimpleAsks().length).toBe(3);
		expect(orderBook.getSimpleAsks()[0].price).toBe(90.86);
		expect(orderBook.getSimpleAsks()[0].volume).toBe(2.30623);
	});
});