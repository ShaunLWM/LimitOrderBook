import BigNumber from "bignumber.js";
import OrderList from "./OrderList";

export default class Order {
	type: OrderType;
	time: number;
	quantity: BigNumber;
	price: number;
	orderId: string;
	side: OrderSide;

	nextOrder: Order | null = null;
	prevOrder: Order | null = null;
	orderList: OrderList;

	constructor(quote: Quote, orderList: OrderList) {
		if (!quote.side) throw new Error("Quote should have a side");
		this.time = quote.time;
		this.quantity = new BigNumber(quote.quantity);
		this.price = quote.price;
		this.orderId = quote.orderId;
		this.orderList = orderList;
		this.side = quote.side;
		this.type = quote.type;
	}

	updateQuantity(quantity: number, timestamp: number) {
		if (new BigNumber(quantity).isGreaterThan(this.quantity) && this.orderList.tailOrder !== null && this.orderList.tailOrder.toString() !== this.toString()) {
			this.orderList.moveToTail(this);
		}

		this.orderList.volume = this.orderList.volume.minus(this.quantity.minus(quantity));
		this.time = timestamp;
		this.quantity = new BigNumber(quantity);
	}

	toString() {
		return `${this.time}-${this.quantity}-${this.price}-${this.orderId}`;
	}
}
