import OrderList from "./OrderList";

export default class Order implements Quote {
	timestamp: number;
	quantity: number;
	price: number;
	orderId: number;
	tradeId: number;
	side: "ask" | "bid";

	nextOrder: Order | null = null;
	prevOrder: Order | null = null;
	orderList: OrderList;

	constructor(quote: Quote, orderList: OrderList) {
		if (!quote.side) throw new Error("Quote should have a side");
		this.timestamp = quote.timestamp;
		this.quantity = quote.quantity;
		this.price = quote.price;
		this.orderId = quote.orderId;
		this.tradeId = quote.tradeId;
		this.orderList = orderList;
		this.side = quote.side;
	}

	updateQuantity(quantity: number, timestamp: number) {
		if (
			quantity > this.quantity &&
			this.orderList.tailOrder !== null &&
			this.orderList.tailOrder.toString() !== this.toString()
		) {
			this.orderList.moveToTail(this);
		}

		this.orderList.volume -= this.quantity - quantity;
		this.timestamp = timestamp;
		this.quantity = quantity;
	}

	toString() {
		return `${this.timestamp}-${this.quantity}-${this.price}-${this.orderId}-${this.tradeId}`;
	}
}
