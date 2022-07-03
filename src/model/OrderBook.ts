import Denque from "denque";
import OrderTree from "./OrderTree";
import OrderList from "./OrderList";
import { EventEmitter2 } from "eventemitter2";

export default class OrderBook extends EventEmitter2 {
	tape: Denque;
	bids: OrderTree;
	asks: OrderTree;
	lastTick: number | null;
	lastTimestamp: number;
	tickSize: number;
	time: number;
	nextOrderId: number;

	constructor({ tickSize = 0.0001 }: { tickSize?: number } = {}) {
		super({ wildcard: true, delimiter: ":" });
		this.tape = new Denque<TransactionRecord>();
		this.bids = new OrderTree();
		this.asks = new OrderTree();
		this.lastTick = null;
		this.lastTimestamp = 0;
		this.tickSize = tickSize;
		this.time = 0;
		this.nextOrderId = 0;
		this.setupListeners();
	}

	setupListeners() {
		this.bids.onAny((event, value) => this.emit(event, value));
		this.asks.onAny((event, value) => this.emit(event, value));
	}

	updateTime() {
		this.time += 1;
	}

	processOrder(quote: Quote, fromData: boolean) {
		const orderType = quote.type;
		let orderInBook = null;
		let trades = null;

		if (fromData) {
			this.time = quote.timestamp;
		} else {
			this.updateTime();
		}

		quote.timestamp = this.time;
		if (quote.quantity <= 0) {
			return {
				trades,
				orderInBook,
			};
		}

		if (!fromData) {
			this.nextOrderId += 1;
		}

		if (orderType === "market") {
			trades = this.processMarketOrder(quote);
		} else if (orderType === "limit") {
			const result = this.processLimitOrder(quote, fromData);
			trades = result.trades;
			orderInBook = result.orderInBook;
		} else {
			throw new Error(`orderType for processOrder() is neither 'market' or 'limit'`);
		}

		return {
			trades,
			orderInBook,
		};
	}

	processOrderList(side: "bid" | "ask", orderList: OrderList | null, quantityStillToTrade: number, quote: Quote) {
		const trades: Array<TransactionRecord> = [];
		let quantityToTrade = quantityStillToTrade;
		while (orderList && orderList.length > 0 && quantityToTrade > 0) {
			const headOrder = orderList.getHeadOrder();
			if (headOrder) {
				const tradedPrice = headOrder.price;
				const counterParty = headOrder.tradeId;
				let newBookQuantity = null;
				let tradedQuantity = null;

				if (quantityToTrade < headOrder.quantity) {
					tradedQuantity = quantityToTrade;
					newBookQuantity = headOrder.quantity - quantityToTrade;
					headOrder.updateQuantity(newBookQuantity, headOrder.timestamp);
					quantityToTrade = 0;
				} else if (quantityToTrade === headOrder.quantity) {
					tradedQuantity = quantityToTrade;
					if (side === "bid") this.bids.removeOrderById(headOrder.orderId);
					else this.asks.removeOrderById(headOrder.orderId);
					quantityToTrade = 0;
				} else {
					tradedQuantity = headOrder.quantity;
					if (side === "bid") {
						this.bids.removeOrderById(headOrder.orderId);
					} else {
						this.asks.removeOrderById(headOrder.orderId);
					}

					quantityToTrade -= tradedQuantity;
				}

				this.emit("transaction:new", {
					time: this.time,
					price: tradedPrice,
					quantity: tradedQuantity,
					from: counterParty,
					to: quote.tradeId,
				});

				const transactionRecord: TransactionRecord = {
					timestamp: this.time,
					price: tradedPrice,
					quantity: tradedQuantity,
					time: this.time,
				};

				if (side === "bid") {
					transactionRecord["party1"] = [counterParty, "bid", headOrder.orderId, newBookQuantity];
					transactionRecord["party2"] = [quote.tradeId, "ask", null, null];
				} else {
					transactionRecord["party1"] = [counterParty, "ask", headOrder.orderId, newBookQuantity];
					transactionRecord["party2"] = [quote.tradeId, "bid", null, null];
				}

				this.tape.push(transactionRecord);
				trades.push(transactionRecord);
			}
		}

		return {
			trades,
			quantityToTrade,
		};
	}

	processMarketOrder(quote: Quote) {
		const trades = [];
		let quantityToTrade = quote.quantity;
		const { side } = quote;
		switch (side) {
			case "bid":
				while (quantityToTrade > 0 && this.asks) {
					const bestPriceAsks = this.asks.minPriceList();
					const result = this.processOrderList("ask", bestPriceAsks, quantityToTrade, quote);
					quantityToTrade = result.quantityToTrade;
					trades.push(...result.trades);
				}
				break;

			case "ask":
				while (quantityToTrade > 0 && this.bids) {
					const bestPriceBids = this.bids.maxPriceList();
					const result = this.processOrderList("bid", bestPriceBids, quantityToTrade, quote);
					quantityToTrade = result.quantityToTrade;
					trades.push(...result.trades);
				}
				break;

			default:
				throw new Error(`processMarketOrder() received neither "bid" nor "ask"`);
		}
	}

	processLimitOrder(quote: Quote, fromData: boolean) {
		let orderInBook = null;
		const trades: Array<TransactionRecord> = [];
		let quantityToTrade = quote.quantity;
		const { side, price } = quote;

		switch (side) {
			case "bid":
				let minPrice = this.asks.minPrice();
				while (this.asks && minPrice && price >= minPrice && quantityToTrade > 0) {
					const bestPriceAsks = this.asks.minPriceList();
					const result = this.processOrderList("ask", bestPriceAsks, quantityToTrade, quote);
					quantityToTrade = result.quantityToTrade;
					trades.push(...result.trades);
					minPrice = this.asks.minPrice();
				}

				if (quantityToTrade > 0) {
					if (!fromData) quote.orderId = this.nextOrderId;
					quote.quantity = quantityToTrade;
					this.bids.insertOrder(quote);
					orderInBook = quote;
				}

				break;

			case "ask":
				let maxPrice = this.bids.maxPrice();
				while (this.bids && maxPrice && price <= maxPrice && quantityToTrade > 0) {
					const bestPriceBids = this.bids.maxPriceList();
					const result = this.processOrderList("bid", bestPriceBids, quantityToTrade, quote);
					quantityToTrade = result.quantityToTrade;
					trades.push(...result.trades);
					maxPrice = this.bids.maxPrice();
				}

				if (quantityToTrade > 0) {
					if (!fromData) quote.orderId = this.nextOrderId;
					quote.quantity = quantityToTrade;
					this.asks.insertOrder(quote);
					orderInBook = quote;
				}

				break;

			default:
				throw new Error(`processLimitOrder() given neither "bid" nor "ask"`);
		}

		return {
			trades,
			orderInBook,
		};
	}

	cancelOrder(side: "ask" | "bid", orderId: number, time: number | null = null) {
		if (time) {
			this.time = time;
		} else {
			this.updateTime();
		}

		switch (side) {
			case "bid":
				if (this.bids.orderExists(orderId)) {
					this.bids.removeOrderById(orderId);
				}
				break;

			case "ask":
				if (this.asks.orderExists(orderId)) {
					this.asks.removeOrderById(orderId);
				}
				break;

			default:
				throw new Error("cancelOrder given neither 'bid' nor 'ask'")
		}
	}

	modifyOrder(orderId: number, orderUpdate: Quote, time: number | null = null) {
		if (time) {
			this.time = time;
		} else {
			this.updateTime();
		}

		const { side } = orderUpdate;
		orderUpdate.orderId = orderId;
		orderUpdate.timestamp = this.time;

		switch (side) {
			case "bid":
				if (this.bids.orderExists(orderUpdate)) {
					this.bids.updateOrder(orderUpdate);
				}
				break;

			case "ask":
				if (this.asks.orderExists(orderUpdate)) {
					this.asks.updateOrder(orderUpdate);
				}
				break;

			default:
				throw new Error(`modifyOrder() given neither "bid" nor "ask"`);
		}
	}

	getVolumeAtPrice(side: "ask" | "bid", price: number) {
		let volume = 0;
		switch (side) {
			case "bid":
				const b = this.bids.getPrice(price);
				if (this.bids.priceExists(price) && b) volume = b.volume;
				break;

			case "ask":
				const a = this.asks.getPrice(price);
				if (this.asks.priceExists(price) && a) volume = a.volume;
				break;

			default:
				throw new Error(`getVolumeAtPrice() given neither "bid" nor "ask"`);
		}

		return volume;
	}

	getBestBid() {
		return this.bids.maxPrice();
	}

	getWorstBid() {
		return this.bids.minPrice();
	}

	getBestAsk() {
		return this.asks.minPrice();
	}

	getWorstAsk() {
		return this.asks.maxPrice();
	}

	toString() {
		let str = "***Bids***\n";
		if (this.bids && this.bids.length > 0) {
			this.bids.priceMap.sortByKey((a, b) => b - a);
			this.bids.priceMap.forEach((order) => (str += order.value.toString()));
		}

		str += "\n***Asks***\n";
		if (this.asks && this.asks.length > 0) {
			this.asks.priceMap.forEach((order) => (str += order.value.toString()));
		}

		str += "\n***Transactions (first 10)***\n";
		if (this.tape && this.tape.length > 0) {
			let num = 0;
			for (let entry of this.tape.toArray()) {
				if (num < 10) {
					str += `Trans: ${entry.price}x${entry.quantity} From: ${entry.party1[0]}, To: ${entry.party2[0]}\n`;
					num += 1;
				} else break;
			}
		}

		str += "\n";
		return str;
	}

	emito(event: string, ...args: any) {
		this.emit(event, args);
	}
}
