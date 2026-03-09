import { roundFloat } from "../lib/Helper.js";
import type { OrderSide, OrderType, Quote } from "../types/index.js";
import type OrderList from "./OrderList.js";

export default class Order {
	readonly type: OrderType;
	readonly orderId: string;
	readonly side: OrderSide;
	readonly price: number;
	time: number;
	quantity: number;

	nextOrder: Order | null = null;
	prevOrder: Order | null = null;
	orderList: OrderList;

	constructor(quote: Quote, orderList: OrderList) {
		this.time = quote.time;
		this.quantity = quote.quantity;
		this.price = quote.price;
		this.orderId = quote.orderId;
		this.orderList = orderList;
		this.side = quote.side;
		this.type = quote.type;
	}

	updateQuantity(quantity: number, timestamp: number) {
		if (
			quantity > this.quantity &&
			this.orderList.tailOrder !== null &&
			this.orderList.tailOrder.toString() !== this.toString()
		) {
			this.orderList.moveToTail(this);
		}

		this.orderList.volume = roundFloat(this.orderList.volume - (this.quantity - quantity));
		this.time = timestamp;
		this.quantity = quantity;
	}

	toString() {
		return `${this.time}-${this.quantity}-${this.price}-${this.orderId}`;
	}
}
