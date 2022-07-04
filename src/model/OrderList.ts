import Order from "./Order";

export default class OrderList {
	headOrder: Order | null = null;
	tailOrder: Order | null = null;
	length = 0;
	volume = 0;
	last: Order | null = null;
	hasValue: boolean = true;

	constructor() {}

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
		} else {
			order.prevOrder = this.tailOrder;
			order.nextOrder = null;
			this.tailOrder!.nextOrder = order;
		}

		this.tailOrder = order;
		this.length += 1;
		this.volume += order.quantity;
	}

	removeOrder(order: Order) {
		this.volume -= order.quantity;
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
		if (order.prevOrder) order.prevOrder.nextOrder = order.nextOrder;
		else this.headOrder = order.nextOrder;

		order.nextOrder!.prevOrder = order.prevOrder; // WARN
		order.prevOrder = this.tailOrder;
		order.nextOrder = null;

		this.tailOrder!.nextOrder = order;
		this.tailOrder = order;
	}

	toString() {
		let str = "";
		for (const element of this) {
			if (element === null) break;
			str += `Order: [${element.orderId}] Price - ${element.price}, Quantity - ${element.quantity}, Timestamp - ${element.timestamp}\n`;
		}

		return str;
	}
}
