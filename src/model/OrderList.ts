import { roundFloat } from "../lib/Helper.js";
import type Order from "./Order.js";

export default class OrderList {
	headOrder: Order | null = null;
	tailOrder: Order | null = null;
	length: number;
	volume: number;

	constructor() {
		this.length = 0;
		this.volume = 0;
	}

	*[Symbol.iterator]() {
		let current = this.headOrder;
		while (current) {
			yield current;
			current = current.nextOrder;
		}
	}

	getHeadOrder() {
		return this.headOrder;
	}

	appendOrder(order: Order) {
		if (this.length === 0) {
			order.nextOrder = null;
			order.prevOrder = null;
			this.headOrder = order;
		} else if (this.tailOrder) {
			order.prevOrder = this.tailOrder;
			order.nextOrder = null;
			this.tailOrder.nextOrder = order;
		}

		this.tailOrder = order;
		this.length += 1;
		this.volume = roundFloat(this.volume + order.quantity);
	}

	removeOrder(order: Order) {
		this.volume = roundFloat(this.volume - order.quantity);
		this.length -= 1;
		if (this.length === 0) return;
		const { nextOrder, prevOrder } = order;
		if (nextOrder && prevOrder) {
			nextOrder.prevOrder = prevOrder;
			prevOrder.nextOrder = nextOrder;
		} else if (nextOrder) {
			nextOrder.prevOrder = null;
			this.headOrder = nextOrder;
		} else if (prevOrder) {
			prevOrder.nextOrder = null;
			this.tailOrder = prevOrder;
		}
	}

	moveToTail(order: Order) {
		if (order.prevOrder) {
			order.prevOrder.nextOrder = order.nextOrder;
		} else {
			this.headOrder = order.nextOrder;
		}

		if (order.nextOrder) {
			order.nextOrder.prevOrder = order.prevOrder;
		}

		order.prevOrder = this.tailOrder;
		order.nextOrder = null;

		if (this.tailOrder) {
			this.tailOrder.nextOrder = order;
		}
		this.tailOrder = order;
	}

	toString() {
		let str = "";
		for (const element of this) {
			if (element === null) break;
			str += `Order: [${element.orderId}] Price - ${element.price}, Quantity - ${element.quantity}, Timestamp - ${element.time}\n`;
		}

		return str;
	}
}
