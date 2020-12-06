import { SortedDictionary } from "yaca";
import OrderList from "./OrderList";
import Order from "./Order";
import { EventEmitter2 } from "eventemitter2";

export default class OrderTree extends EventEmitter2 {
	priceMap: SortedDictionary<number, OrderList>;
	prices: Array<number>;
	orderMap: { [orderId: number]: Order };
	numOrders: number;
	depth: number;
	volume: number;

	constructor() {
		super({ wildcard: true, delimiter: ":" });
		this.priceMap = new SortedDictionary<number, OrderList>();
		this.prices = this.priceMap.getKeys();
		this.orderMap = {};
		this.numOrders = 0;
		this.depth = 0;
		this.volume = 0;
	}

	get length(): number {
		return Object.keys(this.orderMap).length;
	}

	getPriceList(price: number): OrderList | null {
		if (price === null) return null;
		return this.priceMap.get(price);
	}

	getOrder(orderId: number) {
		return this.orderMap[orderId];
	}

	updatePriceKeys() {
		this.prices = this.priceMap.getKeys();
	}

	createPrice(price: number) {
		this.depth += 1;
		this.priceMap.set(price, new OrderList());
		this.emit("price:new", { price });
	}

	removePrice(price: number) {
		this.depth -= 1;
		this.priceMap.remove(price);
		this.emit("price:remove", { price });
	}

	priceExists(price: number) {
		return this.priceMap.containsKey(price);
	}

	orderExists(order: Quote) {
		return typeof this.orderMap[order.orderId] !== "undefined";
	}

	insertOrder(quote: Quote) {
		if (this.orderExists(quote)) this.removeOrderById(quote.orderId);
		this.numOrders += 1;
		if (!this.priceMap.containsKey(quote.price)) this.createPrice(quote.price);
		const order = new Order((quote as unknown) as Quote, this.priceMap.get(quote.price)); // WARN
		this.priceMap.get(order.price).appendOrder(order);
		this.orderMap[order.orderId] = order;
		this.volume += order.quantity;
		this.updatePriceKeys();
		this.emit("order:new", quote);
	}

	updateOrder(orderUpdate: Quote) {
		const order = this.orderMap[orderUpdate.orderId];
		const originalQuantity = order.quantity;
		if (orderUpdate.price !== order.price) {
			// Price changed. Remove order and update tree.
			const orderList = this.priceMap.get(order.price);
			orderList.removeOrder(order);
			if (orderList.length === 0) this.removePrice(order.price);
			this.insertOrder(orderUpdate);
		} else order.updateQuantity(orderUpdate.quantity, orderUpdate.timestamp);
		this.volume += order.quantity - originalQuantity;
		this.updatePriceKeys();
		this.emit("order:update", orderUpdate);
	}

	removeOrderById(orderId: number) {
		this.numOrders -= 1;
		const order = this.orderMap[orderId];
		if (!order) throw new Error("Order does not exist");
		this.volume -= order.quantity;
		order.orderList.removeOrder(order);
		if (order.orderList.length === 0) {
			this.removePrice(order.price);
			delete this.orderMap[orderId];
		}

		this.updatePriceKeys();
		this.emit("order:remove", order);
	}

	maxPrice() {
		if (this.depth > 0) return this.prices[this.prices.length - 1];
		return null;
	}

	minPrice() {
		if (this.depth > 0) return this.prices[0];
		return null;
	}

	maxPriceList() {
		if (this.depth > 0) return this.getPriceList(this.maxPrice()!);
		return null;
	}

	minPriceList() {
		if (this.depth > 0) return this.getPriceList(this.minPrice()!);
		return null;
	}

	getPrice(price: number) {
		if (this.depth > 0) return this.getPriceList(price);
		return null;
	}
}
