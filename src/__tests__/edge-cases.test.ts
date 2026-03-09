import { beforeEach, describe, expect, it, vi } from "vitest";
import OrderBook from "../model/OrderBook.js";

describe("Edge Cases", () => {
	let book: OrderBook;
	let counter: number;

	beforeEach(() => {
		counter = 0;
		book = new OrderBook({ idGenerator: () => String(++counter) });
	});

	describe("Empty book", () => {
		it("should return null for best/worst prices", () => {
			expect(book.getBestBid()).toBeNull();
			expect(book.getBestAsk()).toBeNull();
			expect(book.getWorstBid()).toBeNull();
			expect(book.getWorstAsk()).toBeNull();
		});

		it("should return null for spread and mid price", () => {
			expect(book.getSpread()).toBeNull();
			expect(book.getMidPrice()).toBeNull();
		});

		it("should return empty simple book", () => {
			const simple = book.getSimpleBook();
			expect(simple.bids).toHaveLength(0);
			expect(simple.asks).toHaveLength(0);
		});

		it("should return 0 for counts", () => {
			expect(book.getOrderCount()).toBe(0);
			expect(book.getPriceLevelCount()).toBe(0);
		});
	});

	describe("Market order on empty book", () => {
		it("should return empty trades for bid market order (no infinite loop)", () => {
			const { trades } = book.processOrder({ type: "market", side: "bid", quantity: 10 });
			expect(trades).toHaveLength(0);
		});

		it("should return empty trades for ask market order (no infinite loop)", () => {
			const { trades } = book.processOrder({ type: "market", side: "ask", quantity: 10 });
			expect(trades).toHaveLength(0);
		});
	});

	describe("Market order partial fill", () => {
		it("should fill only available quantity for bid", () => {
			book.processOrder({ type: "limit", side: "ask", quantity: 3, price: 100 });
			const { trades } = book.processOrder({ type: "market", side: "bid", quantity: 10 });
			expect(trades).toHaveLength(1);
			expect(trades[0].quantity).toBe(3);
			expect(book.getBestAsk()).toBeNull();
		});

		it("should fill only available quantity for ask", () => {
			book.processOrder({ type: "limit", side: "bid", quantity: 5, price: 100 });
			const { trades } = book.processOrder({ type: "market", side: "ask", quantity: 10 });
			expect(trades).toHaveLength(1);
			expect(trades[0].quantity).toBe(5);
			expect(book.getBestBid()).toBeNull();
		});
	});

	describe("cancelOrder edge cases", () => {
		it("should be a no-op for non-existent order", () => {
			expect(() => book.cancelOrder("bid", "nonexistent")).not.toThrow();
		});

		it("should be a no-op on empty book", () => {
			expect(() => book.cancelOrder("ask", "1")).not.toThrow();
		});
	});

	describe("modifyOrder edge cases", () => {
		it("should be a no-op for non-existent order", () => {
			expect(() =>
				book.modifyOrder("nonexistent", {
					type: "limit",
					side: "bid",
					quantity: 5,
					price: 100,
					orderId: "nonexistent",
					time: Date.now(),
				}),
			).not.toThrow();
		});

		it("should correctly update an existing order (regression: string vs object)", () => {
			const { orderInBook } = book.processOrder({ type: "limit", side: "bid", quantity: 5, price: 100 });
			book.modifyOrder(orderInBook?.orderId, {
				type: "limit",
				side: "bid",
				quantity: 10,
				price: 100,
				orderId: orderInBook?.orderId,
				time: Date.now(),
			});
			const order = book.getOrder(orderInBook?.orderId);
			expect(order).not.toBeNull();
			expect(order?.quantity).toBe(10);
		});
	});

	describe("Event emission", () => {
		it("should emit events when enabled", () => {
			const eventBook = new OrderBook({
				enableEvents: true,
				idGenerator: () => String(++counter),
			});
			const events: string[] = [];
			eventBook.onAny((event) => {
				events.push(typeof event === "string" ? event : event.join(":"));
			});

			eventBook.processOrder({ type: "limit", side: "bid", quantity: 5, price: 100 });
			expect(events).toContain("price:new");
			expect(events).toContain("order:new");
		});

		it("should emit transaction:new on trade", () => {
			const eventBook = new OrderBook({
				enableEvents: true,
				idGenerator: () => String(++counter),
			});
			const trades: unknown[] = [];
			eventBook.on("transaction:new", (trade) => {
				trades.push(trade);
			});

			eventBook.processOrder({ type: "limit", side: "ask", quantity: 5, price: 100 });
			eventBook.processOrder({ type: "limit", side: "bid", quantity: 3, price: 100 });
			expect(trades).toHaveLength(1);
		});

		it("should not throw with events disabled", () => {
			const noEventBook = new OrderBook({
				enableEvents: false,
				idGenerator: () => String(++counter),
			});
			expect(() => {
				noEventBook.processOrder({ type: "limit", side: "bid", quantity: 5, price: 100 });
				noEventBook.processOrder({ type: "limit", side: "ask", quantity: 3, price: 100 });
				noEventBook.processOrder({ type: "limit", side: "bid", quantity: 3, price: 100 });
			}).not.toThrow();
		});

		it("should not call listeners when events disabled", () => {
			const noEventBook = new OrderBook({
				enableEvents: false,
				idGenerator: () => String(++counter),
			});
			const listener = vi.fn();
			noEventBook.onAny(listener);
			noEventBook.processOrder({ type: "limit", side: "bid", quantity: 5, price: 100 });
			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe("Invalid inputs", () => {
		it("should throw on zero quantity", () => {
			expect(() => book.processOrder({ type: "limit", side: "bid", quantity: 0, price: 100 })).toThrow(
				"quantity must be greater than 0",
			);
		});

		it("should throw on negative quantity", () => {
			expect(() => book.processOrder({ type: "limit", side: "bid", quantity: -1, price: 100 })).toThrow(
				"quantity must be greater than 0",
			);
		});
	});
});
