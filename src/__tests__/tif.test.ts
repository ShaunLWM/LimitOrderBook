import { beforeEach, describe, expect, it } from "vitest";
import OrderBook from "../model/OrderBook.js";
import type { LimitQuote } from "../types/index.js";

describe("Time-in-Force", () => {
	let book: OrderBook;
	let counter: number;

	beforeEach(() => {
		counter = 0;
		book = new OrderBook({ idGenerator: () => String(++counter) });
	});

	const seedAsks = () => {
		book.processOrder({ type: "limit", side: "ask", quantity: 3, price: 101 });
		book.processOrder({ type: "limit", side: "ask", quantity: 2, price: 102 });
	};

	const seedBids = () => {
		book.processOrder({ type: "limit", side: "bid", quantity: 3, price: 99 });
		book.processOrder({ type: "limit", side: "bid", quantity: 2, price: 98 });
	};

	describe("GTC (default)", () => {
		it("should leave remainder in book", () => {
			seedAsks();
			const { trades, orderInBook } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 5,
				price: 101,
			});
			expect(trades).toHaveLength(1);
			expect(trades[0].quantity).toBe(3);
			expect(orderInBook).not.toBeNull();
			expect(orderInBook?.quantity).toBe(2);
			expect(book.getBestBid()).toBe(101);
		});

		it("should behave the same when explicitly set", () => {
			seedAsks();
			const { orderInBook } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 5,
				price: 101,
				timeInForce: "GTC",
			});
			expect(orderInBook).not.toBeNull();
			expect(book.getBestBid()).toBe(101);
		});
	});

	describe("IOC", () => {
		it("should fill what it can and cancel remainder", () => {
			seedAsks();
			const { trades, orderInBook } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 5,
				price: 101,
				timeInForce: "IOC",
			});
			expect(trades).toHaveLength(1);
			expect(trades[0].quantity).toBe(3);
			expect(orderInBook).toBeNull();
			expect(book.getBestBid()).toBeNull();
		});

		it("should return empty trades when no match", () => {
			seedAsks();
			const { trades, orderInBook } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 5,
				price: 99,
				timeInForce: "IOC",
			});
			expect(trades).toHaveLength(0);
			expect(orderInBook).toBeNull();
			expect(book.getBestBid()).toBeNull();
		});

		it("should handle full fill", () => {
			seedAsks();
			const { trades, orderInBook } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 3,
				price: 101,
				timeInForce: "IOC",
			});
			expect(trades).toHaveLength(1);
			expect(trades[0].quantity).toBe(3);
			expect(orderInBook).toBeNull();
		});

		it("should work on ask side", () => {
			seedBids();
			const { trades, orderInBook } = book.processOrder({
				type: "limit",
				side: "ask",
				quantity: 5,
				price: 99,
				timeInForce: "IOC",
			});
			expect(trades).toHaveLength(1);
			expect(trades[0].quantity).toBe(3);
			expect(orderInBook).toBeNull();
			expect(book.getBestAsk()).toBeNull();
		});
	});

	describe("FOK", () => {
		it("should fill completely when enough liquidity", () => {
			seedAsks();
			const { trades, orderInBook } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 3,
				price: 101,
				timeInForce: "FOK",
			});
			expect(trades).toHaveLength(1);
			expect(trades[0].quantity).toBe(3);
			expect(orderInBook).toBeNull();
		});

		it("should reject when insufficient liquidity", () => {
			seedAsks();
			const { trades, orderInBook } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 4,
				price: 101,
				timeInForce: "FOK",
			});
			expect(trades).toHaveLength(0);
			expect(orderInBook).toBeNull();
			// Book should be unchanged
			expect(book.getBestAsk()).toBe(101);
			expect(book.getVolumeAtPrice("ask", 101)).toBe(3);
		});

		it("should reject on empty book", () => {
			const { trades, orderInBook } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 1,
				price: 100,
				timeInForce: "FOK",
			});
			expect(trades).toHaveLength(0);
			expect(orderInBook).toBeNull();
		});

		it("should fill across price levels when enough total liquidity", () => {
			seedAsks();
			const { trades } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 5,
				price: 102,
				timeInForce: "FOK",
			});
			expect(trades).toHaveLength(2);
			expect(trades[0].quantity).toBe(3);
			expect(trades[0].price).toBe(101);
			expect(trades[1].quantity).toBe(2);
			expect(trades[1].price).toBe(102);
		});

		it("should work on ask side", () => {
			seedBids();
			const { trades } = book.processOrder({
				type: "limit",
				side: "ask",
				quantity: 3,
				price: 99,
				timeInForce: "FOK",
			});
			expect(trades).toHaveLength(1);
			expect(trades[0].quantity).toBe(3);
		});

		it("should reject on ask side with insufficient liquidity", () => {
			seedBids();
			const { trades } = book.processOrder({
				type: "limit",
				side: "ask",
				quantity: 4,
				price: 99,
				timeInForce: "FOK",
			});
			expect(trades).toHaveLength(0);
			expect(book.getBestBid()).toBe(99);
			expect(book.getVolumeAtPrice("bid", 99)).toBe(3);
		});

		it("should handle exact fill", () => {
			seedAsks();
			const { trades } = book.processOrder({
				type: "limit",
				side: "bid",
				quantity: 5,
				price: 102,
				timeInForce: "FOK",
			});
			expect(trades).toHaveLength(2);
			expect(book.getBestAsk()).toBeNull();
		});
	});
});
