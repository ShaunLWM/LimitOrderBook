import { beforeEach, describe, expect, it } from "vitest";
import OrderBook from "../model/OrderBook.js";
import type { LimitQuote } from "../types/index.js";

describe("API Methods", () => {
	let book: OrderBook;
	let counter: number;

	beforeEach(() => {
		counter = 0;
		book = new OrderBook({ idGenerator: () => String(++counter) });
	});

	const seedBook = () => {
		const orders: LimitQuote[] = [
			{ type: "limit", side: "bid", quantity: 5, price: 100 },
			{ type: "limit", side: "bid", quantity: 3, price: 99 },
			{ type: "limit", side: "bid", quantity: 2, price: 98 },
			{ type: "limit", side: "ask", quantity: 4, price: 101 },
			{ type: "limit", side: "ask", quantity: 6, price: 102 },
			{ type: "limit", side: "ask", quantity: 1, price: 103 },
		];
		for (const o of orders) book.processOrder(o);
	};

	describe("getSpread", () => {
		it("should return spread with both sides", () => {
			seedBook();
			expect(book.getSpread()).toBe(1);
		});

		it("should return null with only bids", () => {
			book.processOrder({ type: "limit", side: "bid", quantity: 1, price: 100 });
			expect(book.getSpread()).toBeNull();
		});

		it("should return null with only asks", () => {
			book.processOrder({ type: "limit", side: "ask", quantity: 1, price: 100 });
			expect(book.getSpread()).toBeNull();
		});

		it("should return null on empty book", () => {
			expect(book.getSpread()).toBeNull();
		});
	});

	describe("getMidPrice", () => {
		it("should return mid price with both sides", () => {
			seedBook();
			expect(book.getMidPrice()).toBe(100.5);
		});

		it("should return null with one side empty", () => {
			book.processOrder({ type: "limit", side: "bid", quantity: 1, price: 100 });
			expect(book.getMidPrice()).toBeNull();
		});

		it("should return null on empty book", () => {
			expect(book.getMidPrice()).toBeNull();
		});
	});

	describe("getDepth", () => {
		it("should return top N levels", () => {
			seedBook();
			const depth = book.getDepth(2);
			expect(depth.bids).toHaveLength(2);
			expect(depth.asks).toHaveLength(2);
			// Bids descending
			expect(depth.bids[0].price).toBe(100);
			expect(depth.bids[1].price).toBe(99);
			// Asks ascending
			expect(depth.asks[0].price).toBe(101);
			expect(depth.asks[1].price).toBe(102);
		});

		it("should return all levels when no limit", () => {
			seedBook();
			const depth = book.getDepth();
			expect(depth.bids).toHaveLength(3);
			expect(depth.asks).toHaveLength(3);
		});

		it("should return correct volumes", () => {
			seedBook();
			const depth = book.getDepth(1);
			expect(depth.bids[0]).toEqual({ price: 100, volume: 5 });
			expect(depth.asks[0]).toEqual({ price: 101, volume: 4 });
		});

		it("should return empty arrays on empty book", () => {
			const depth = book.getDepth();
			expect(depth.bids).toHaveLength(0);
			expect(depth.asks).toHaveLength(0);
		});
	});

	describe("getOrder", () => {
		it("should find a bid order", () => {
			const { orderInBook } = book.processOrder({ type: "limit", side: "bid", quantity: 5, price: 100 });
			const order = book.getOrder(orderInBook?.orderId);
			expect(order).not.toBeNull();
			expect(order?.side).toBe("bid");
			expect(order?.price).toBe(100);
			expect(order?.quantity).toBe(5);
		});

		it("should find an ask order", () => {
			const { orderInBook } = book.processOrder({ type: "limit", side: "ask", quantity: 3, price: 200 });
			const order = book.getOrder(orderInBook?.orderId);
			expect(order).not.toBeNull();
			expect(order?.side).toBe("ask");
			expect(order?.price).toBe(200);
		});

		it("should return null for non-existent order", () => {
			expect(book.getOrder("nonexistent")).toBeNull();
		});
	});

	describe("getOrderCount", () => {
		it("should return 0 on empty book", () => {
			expect(book.getOrderCount()).toBe(0);
		});

		it("should count orders on both sides", () => {
			seedBook();
			expect(book.getOrderCount()).toBe(6);
		});

		it("should decrease after cancel", () => {
			const { orderInBook } = book.processOrder({ type: "limit", side: "bid", quantity: 1, price: 100 });
			expect(book.getOrderCount()).toBe(1);
			book.cancelOrder("bid", orderInBook?.orderId);
			expect(book.getOrderCount()).toBe(0);
		});
	});

	describe("getPriceLevelCount", () => {
		it("should return 0 on empty book", () => {
			expect(book.getPriceLevelCount()).toBe(0);
		});

		it("should count all price levels", () => {
			seedBook();
			expect(book.getPriceLevelCount()).toBe(6);
		});

		it("should count bid levels only", () => {
			seedBook();
			expect(book.getPriceLevelCount("bid")).toBe(3);
		});

		it("should count ask levels only", () => {
			seedBook();
			expect(book.getPriceLevelCount("ask")).toBe(3);
		});
	});
});
