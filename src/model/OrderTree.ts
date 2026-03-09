import BigNumber from "bignumber.js";
import { EventEmitter2 } from "eventemitter2";
import { SortedDictionary } from "yaca";
import type { Quote } from "../types/index.js";
import Order from "./Order.js";
import OrderList from "./OrderList.js";

export default class OrderTree extends EventEmitter2 {
	priceMap: SortedDictionary<number, OrderList>;
	prices: Array<number>;
	orderMap: Map<string, Order>;
	numOrders: number;
	depth: number;
	volume: BigNumber;

	constructor() {
		super({ wildcard: true, delimiter: ":" });
		this.priceMap = new SortedDictionary<number, OrderList>();
		this.prices = this.priceMap.getKeys();
		this.orderMap = new Map();
		this.numOrders = 0;
		this.depth = 0;
		this.volume = new BigNumber(0);
	}

	get length(): number {
		return this.orderMap.size;
	}

	getPriceList(price: number): OrderList | null {
		if (price === null) {
			return null;
		}

		return this.priceMap.get(price);
	}

	getOrder(orderId: string) {
		return this.orderMap.get(orderId);
	}

	updatePriceKeys() {
		this.priceMap.sortByKey();
		this.prices = this.priceMap.getKeys();
	}

	createPrice(price: number) {
		this.depth += 1;
		this.priceMap.set(price, new OrderList());
		this.updatePriceKeys();
		this.emit("price:new", { price });
	}

	removePrice(price: number) {
		this.depth -= 1;
		this.priceMap.remove(price);
		this.updatePriceKeys();
		this.emit("price:remove", { price });
	}

	priceExists(price: number) {
		return this.priceMap.containsKey(price);
	}

	orderExists(order: Quote | string) {
		if (typeof order === "string") {
			return this.orderMap.has(order);
		}

		return this.orderMap.has(order.orderId);
	}

	insertOrder(quote: Quote) {
		if (this.orderExists(quote)) this.removeOrderById(quote.orderId);
		this.numOrders += 1;
		if (!this.priceMap.containsKey(quote.price)) this.createPrice(quote.price);
		const orderList = this.priceMap.get(quote.price);
		const order = new Order(quote, orderList);
		orderList.appendOrder(order);
		this.orderMap.set(order.orderId, order);
		this.volume = this.volume.plus(order.quantity);
		this.updatePriceKeys();
		this.emit("order:new", quote);
	}

	updateOrder(orderUpdate: Quote) {
		const order = this.orderMap.get(orderUpdate.orderId);
		if (!order) throw new Error("Order does not exist");
		const { quantity: originalQuantity } = order;
		if (orderUpdate.price !== order.price) {
			const orderList = this.priceMap.get(order.price);
			orderList.removeOrder(order);
			if (orderList.length === 0) {
				this.removePrice(order.price);
			}
			this.insertOrder(orderUpdate);
		} else {
			order.updateQuantity(orderUpdate.quantity, orderUpdate.time);
		}

		this.volume = this.volume.plus(order.quantity.minus(originalQuantity));
		this.updatePriceKeys();
		this.emit("order:update", orderUpdate);
	}

	removeOrderById(orderId: string) {
		this.numOrders -= 1;
		const order = this.orderMap.get(orderId);
		if (!order) throw new Error("Order does not exist");
		this.volume = this.volume.minus(order.quantity);
		order.orderList.removeOrder(order);
		if (order.orderList.length === 0) {
			this.removePrice(order.price);
			this.orderMap.delete(orderId);
		}

		this.updatePriceKeys();
		this.emit("order:remove", order);
	}

	maxPrice(): number | null {
		if (this.depth > 0) return this.prices[this.prices.length - 1] ?? null;
		return null;
	}

	minPrice(): number | null {
		if (this.depth > 0) return this.prices[0] ?? null;
		return null;
	}

	maxPriceList() {
		const maxPrice = this.maxPrice();
		if (maxPrice !== null) {
			return this.getPriceList(maxPrice);
		}

		return null;
	}

	minPriceList() {
		const minPrice = this.minPrice();
		if (minPrice !== null) {
			return this.getPriceList(minPrice);
		}

		return null;
	}

	getPrice(price: number) {
		if (this.depth > 0) {
			return this.getPriceList(price);
		}

		return null;
	}
}
