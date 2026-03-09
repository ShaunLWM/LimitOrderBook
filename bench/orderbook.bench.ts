import { bench, describe } from "vitest";
import { OrderBook } from "../src/index.js";

function randomNormal(mean: number, stddev: number): number {
	const u1 = Math.random();
	const u2 = Math.random();
	return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function populateBook(book: OrderBook, levelsPerSide: number, ordersPerLevel: number, midPrice: number) {
	for (let i = 0; i < levelsPerSide; i++) {
		for (let j = 0; j < ordersPerLevel; j++) {
			book.processOrder({
				type: "limit",
				side: "bid",
				quantity: Math.floor(Math.random() * 100) + 1,
				price: midPrice - (i + 1) * 0.01,
			});
			book.processOrder({
				type: "limit",
				side: "ask",
				quantity: Math.floor(Math.random() * 100) + 1,
				price: midPrice + (i + 1) * 0.01,
			});
		}
	}
}

describe("OrderBook - realistic trading", () => {
	bench(
		"mixed operations (60% insert, 20% cancel, 15% match, 5% modify)",
		() => {
			const book = new OrderBook({ enableEvents: false });
			const midPrice = 100;
			populateBook(book, 100, 5, midPrice);

			const trackedOrders: Array<{ orderId: string; side: "bid" | "ask"; price: number }> = [];

			for (let i = 0; i < 10_000; i++) {
				const roll = Math.random();

				if (roll < 0.6) {
					const side = Math.random() < 0.5 ? "bid" : "ask";
					const price =
						side === "bid" ? midPrice - Math.abs(randomNormal(0, 0.5)) : midPrice + Math.abs(randomNormal(0, 0.5));
					const result = book.processOrder({
						type: "limit",
						side,
						quantity: Math.floor(Math.random() * 50) + 1,
						price: Math.round(price * 100) / 100,
					});
					if (result.orderInBook) {
						trackedOrders.push({
							orderId: result.orderInBook.orderId,
							side: result.orderInBook.side as "bid" | "ask",
							price: result.orderInBook.price,
						});
					}
				} else if (roll < 0.8) {
					if (trackedOrders.length > 0) {
						const idx = Math.floor(Math.random() * trackedOrders.length);
						const order = trackedOrders[idx];
						book.cancelOrder(order.side, order.orderId);
						trackedOrders.splice(idx, 1);
					}
				} else if (roll < 0.95) {
					const side = Math.random() < 0.5 ? "bid" : "ask";
					const bestAsk = book.getBestAsk();
					const bestBid = book.getBestBid();
					const price =
						side === "bid" && bestAsk !== null
							? bestAsk + 0.01
							: side === "ask" && bestBid !== null
								? bestBid - 0.01
								: midPrice;
					book.processOrder({
						type: "limit",
						side,
						quantity: Math.floor(Math.random() * 20) + 1,
						price,
					});
				} else {
					if (trackedOrders.length > 0) {
						const idx = Math.floor(Math.random() * trackedOrders.length);
						const order = trackedOrders[idx];
						const tree = order.side === "bid" ? book.bids : book.asks;
						if (tree.orderExists(order.orderId)) {
							const existing = tree.getOrder(order.orderId);
							if (existing) {
								book.modifyOrder(order.orderId, {
									type: "limit",
									side: order.side,
									quantity: Math.floor(Math.random() * 50) + 1,
									price: order.price,
									orderId: order.orderId,
									time: Date.now(),
								});
							}
						}
					}
				}
			}
		},
		{ iterations: 5 },
	);
});

describe("OrderBook - insert only", () => {
	bench(
		"10,000 limit orders at random prices",
		() => {
			const book = new OrderBook({ enableEvents: false });
			for (let i = 0; i < 10_000; i++) {
				const side = Math.random() < 0.5 ? "bid" : "ask";
				book.processOrder({
					type: "limit",
					side,
					quantity: Math.floor(Math.random() * 100) + 1,
					price: Math.round((90 + Math.random() * 20) * 100) / 100,
				});
			}
		},
		{ iterations: 10 },
	);
});

describe("OrderBook - deep book insert", () => {
	bench(
		"insert into book with 10,000 price levels",
		() => {
			const book = new OrderBook({ enableEvents: false });
			populateBook(book, 5000, 1, 100);

			for (let i = 0; i < 1_000; i++) {
				const side = Math.random() < 0.5 ? "bid" : "ask";
				book.processOrder({
					type: "limit",
					side,
					quantity: Math.floor(Math.random() * 100) + 1,
					price: Math.round((50 + Math.random() * 100) * 100) / 100,
				});
			}
		},
		{ iterations: 5 },
	);
});

describe("OrderBook - stress: 1M mixed operations", () => {
	bench(
		"1,000,000 ops on pre-populated book (no events)",
		() => {
			const book = new OrderBook({ enableEvents: false });
			const midPrice = 100;
			populateBook(book, 500, 10, midPrice);

			const trackedOrders: Array<{ orderId: string; side: "bid" | "ask"; price: number }> = [];

			for (let i = 0; i < 1_000_000; i++) {
				const roll = Math.random();

				if (roll < 0.6) {
					const side = Math.random() < 0.5 ? "bid" : "ask";
					const price =
						side === "bid" ? midPrice - Math.abs(randomNormal(0, 1.0)) : midPrice + Math.abs(randomNormal(0, 1.0));
					const result = book.processOrder({
						type: "limit",
						side,
						quantity: Math.floor(Math.random() * 50) + 1,
						price: Math.round(price * 100) / 100,
					});
					if (result.orderInBook) {
						trackedOrders.push({
							orderId: result.orderInBook.orderId,
							side: result.orderInBook.side as "bid" | "ask",
							price: result.orderInBook.price,
						});
						if (trackedOrders.length > 50_000) {
							trackedOrders.splice(0, 10_000);
						}
					}
				} else if (roll < 0.8) {
					if (trackedOrders.length > 0) {
						const idx = Math.floor(Math.random() * trackedOrders.length);
						const order = trackedOrders[idx];
						book.cancelOrder(order.side, order.orderId);
						trackedOrders.splice(idx, 1);
					}
				} else if (roll < 0.95) {
					const side = Math.random() < 0.5 ? "bid" : "ask";
					const bestAsk = book.getBestAsk();
					const bestBid = book.getBestBid();
					const price =
						side === "bid" && bestAsk !== null
							? bestAsk + 0.01
							: side === "ask" && bestBid !== null
								? bestBid - 0.01
								: midPrice;
					book.processOrder({
						type: "limit",
						side,
						quantity: Math.floor(Math.random() * 20) + 1,
						price,
					});
				} else {
					if (trackedOrders.length > 0) {
						const idx = Math.floor(Math.random() * trackedOrders.length);
						const order = trackedOrders[idx];
						const tree = order.side === "bid" ? book.bids : book.asks;
						if (tree.orderExists(order.orderId)) {
							book.modifyOrder(order.orderId, {
								type: "limit",
								side: order.side,
								quantity: Math.floor(Math.random() * 50) + 1,
								price: order.price,
								orderId: order.orderId,
								time: Date.now(),
							});
						}
					}
				}
			}
		},
		{ iterations: 3 },
	);
});

describe("OrderBook - stress: 100K inserts into massive book", () => {
	bench(
		"100,000 inserts into book with 50,000 price levels",
		() => {
			const book = new OrderBook({ enableEvents: false });
			populateBook(book, 25_000, 1, 100);

			for (let i = 0; i < 100_000; i++) {
				const side = Math.random() < 0.5 ? "bid" : "ask";
				book.processOrder({
					type: "limit",
					side,
					quantity: Math.floor(Math.random() * 100) + 1,
					price: Math.round(Math.random() * 500 * 100) / 100,
				});
			}
		},
		{ iterations: 3 },
	);
});

describe("OrderBook - stress: rapid-fire cancellations", () => {
	bench(
		"insert 500K orders then cancel all",
		() => {
			const book = new OrderBook({ enableEvents: false });
			const orders: Array<{ orderId: string; side: "bid" | "ask" }> = [];

			for (let i = 0; i < 500_000; i++) {
				const side = Math.random() < 0.5 ? "bid" : "ask";
				const result = book.processOrder({
					type: "limit",
					side,
					quantity: Math.floor(Math.random() * 100) + 1,
					price: Math.round((side === "bid" ? 90 + Math.random() * 10 : 100 + Math.random() * 10) * 100) / 100,
				});
				if (result.orderInBook) {
					orders.push({ orderId: result.orderInBook.orderId, side });
				}
			}

			for (const order of orders) {
				book.cancelOrder(order.side, order.orderId);
			}
		},
		{ iterations: 3 },
	);
});

describe("OrderBook - stress: match-heavy (90% crossing orders)", () => {
	bench(
		"1M crossing limit orders that match immediately",
		() => {
			const book = new OrderBook({ enableEvents: false });
			const midPrice = 100;
			populateBook(book, 200, 20, midPrice);

			for (let i = 0; i < 1_000_000; i++) {
				const side = Math.random() < 0.5 ? "bid" : "ask";
				const bestAsk = book.getBestAsk();
				const bestBid = book.getBestBid();

				if (Math.random() < 0.9) {
					const price =
						side === "bid" && bestAsk !== null
							? bestAsk + Math.random() * 0.5
							: side === "ask" && bestBid !== null
								? bestBid - Math.random() * 0.5
								: midPrice;
					book.processOrder({
						type: "limit",
						side,
						quantity: Math.floor(Math.random() * 5) + 1,
						price: Math.round(price * 100) / 100,
					});
				} else {
					book.processOrder({
						type: "limit",
						side,
						quantity: Math.floor(Math.random() * 50) + 1,
						price:
							Math.round((side === "bid" ? midPrice - 2 - Math.random() * 3 : midPrice + 2 + Math.random() * 3) * 100) /
							100,
					});
				}

				if (i % 10_000 === 0 && book.bids.length + book.asks.length < 100) {
					populateBook(book, 50, 5, midPrice);
				}
			}
		},
		{ iterations: 3 },
	);
});

describe("OrderBook - getSimpleBook", () => {
	bench(
		"1,000 getSimpleBook calls on 200 price levels",
		() => {
			const book = new OrderBook({ enableEvents: false });
			populateBook(book, 100, 5, 100);

			for (let i = 0; i < 1_000; i++) {
				book.getSimpleBook();
			}
		},
		{ iterations: 10 },
	);
});
