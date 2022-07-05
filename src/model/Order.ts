import OrderList from "./OrderList";

export default class Order implements Quote {
	type: "limit" | "market";
	time: number;
	quantity: number;
	price: number;
	orderId: string;
	side: "ask" | "bid";

	nextOrder: Order | null = null;
	prevOrder: Order | null = null;
	orderList: OrderList;

	constructor(quote: Quote, orderList: OrderList) {
		if (!quote.side) throw new Error("Quote should have a side");
		this.time = quote.time;
		this.quantity = quote.quantity;
		this.price = quote.price;
		this.orderId = quote.orderId;
		this.orderList = orderList;
		this.side = quote.side;
		this.type = quote.type;
	}

	updateQuantity(quantity: number, timestamp: number) {
		if (quantity > this.quantity && this.orderList.tailOrder !== null && this.orderList.tailOrder.toString() !== this.toString()) {
			this.orderList.moveToTail(this);
		}

		this.orderList.volume -= this.quantity - quantity;
		this.time = timestamp;
		this.quantity = quantity;
	}

	toString() {
		return `${this.time}-${this.quantity}-${this.price}-${this.orderId}`;
	}
}
