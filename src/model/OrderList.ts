import Order from "./Order";

export default class OrderList {
	headOrder: Order | null = null;
	tailOrder: Order | null = null;
	length = 0;
	volume = 0;
	last: Order | null = null;
	hasValue: boolean = true;

	constructor() {}

	*iterator() {
		while (this.hasValue) {
			if (this.last === null) {
				if (this.headOrder !== null) this.last = this.headOrder;
				else this.hasValue = false;
			}

			const prevOrder = this.last;
			if (this.last!.nextOrder === null) this.last = null;
			else this.last = this.last!.nextOrder;
			if (this.last === null) this.hasValue = false;
			yield prevOrder;
		}

		this.last = null;
		this.hasValue = true;
		yield null;
	}

	[Symbol.iterator]() {
		return this.iterator();
	}

	getHeadOrder() {
		return this.headOrder;
	}

	appendOrder(order: Order) {
		if (this.length === 0) {
			order.nextOrder = null;
			order.prevOrder = null;
			this.headOrder = order;
			this.tailOrder = order;
		} else {
			order.prevOrder = this.tailOrder;
			order.nextOrder = null;
			this.tailOrder!.nextOrder = order;
			this.tailOrder = order;
		}

		this.length += 1;
		this.volume += order.quantity;
	}

	removeOrder(order: Order) {
		this.volume -= order.quantity;
		this.length -= 1;
		if (this.length === 0) return;
		const nextOrder = order.nextOrder;
		const prevOrder = order.prevOrder;
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
		for (const element of this.iterator()) {
			if (element === null) break;
			str += `Order: [${element.tradeId}] Price - ${element.price}, Quantity - ${element.quantity}, Timestamp - ${element.timestamp}\n`;
		}

		return str;
	}
}
