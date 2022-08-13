import BigNumber from "bignumber.js";
import Denque from "denque";
import { EventEmitter2 } from "eventemitter2";
import { getCurrentUnix, getTxId, getUniqueId } from "../lib/Helper";
import OrderList from "./OrderList";
import OrderTree from "./OrderTree";

export default class OrderBook extends EventEmitter2 {
	tape: Denque<TransactionRecord>;
	bids: OrderTree;
	asks: OrderTree;

	constructor() {
		super({ wildcard: true, delimiter: ":" });
		this.tape = new Denque<TransactionRecord>();
		this.bids = new OrderTree();
		this.asks = new OrderTree();
		this.setupListeners();
	}

	setupListeners() {
		this.bids.onAny((event, value) => this.emit(event, value));
		this.asks.onAny((event, value) => this.emit(event, value));
	}

	processOrder(qte: OrderQuote) {
		const { type: orderType, quantity } = qte;
		let orderInBook = null;
		let trades: TransactionRecord[] = [];

		if (quantity <= 0) {
			throw new Error("quantity must be greater than 0");
		}

		const quote: Quote = {
			...qte,
			time: getCurrentUnix(),
			orderId: getUniqueId(),
		}

		if (orderType === "market") {
			trades = this.processMarketOrder(quote).trades;
		} else if (orderType === "limit") {
			const result = this.processLimitOrder(quote);
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

	processOrderList(side: OrderSide, orderList: OrderList | null, quantityStillToTrade: number, quote: Quote) {
		const trades: Array<TransactionRecord> = [];
		let quantityToTrade = quantityStillToTrade;
		while (orderList && orderList.length > 0 && quantityToTrade > 0) {
			const headOrder = orderList.getHeadOrder();
			if (headOrder) {
				const tradedPrice = headOrder.price;
				const counterParty = headOrder.orderId;
				let newBookQuantity: number | null = null;
				let tradedQuantity: number | null = null;

				if (headOrder.quantity.isGreaterThan(quantityToTrade)) {
					tradedQuantity = quantityToTrade;
					newBookQuantity = headOrder.quantity.minus(quantityToTrade).toNumber();
					headOrder.updateQuantity(newBookQuantity, headOrder.time);
					quantityToTrade = 0;
				} else if (headOrder.quantity.isEqualTo(quantityToTrade)) {
					tradedQuantity = quantityToTrade;
					if (side === "bid") this.bids.removeOrderById(headOrder.orderId);
					else this.asks.removeOrderById(headOrder.orderId);
					quantityToTrade = 0;
				} else {
					tradedQuantity = headOrder.quantity.toNumber();
					if (side === "bid") {
						this.bids.removeOrderById(headOrder.orderId);
					} else {
						this.asks.removeOrderById(headOrder.orderId);
					}

					quantityToTrade = new BigNumber(quantityToTrade).minus(tradedQuantity).toNumber();
				}

				const tx = {
					txId: getTxId(),
					time: getCurrentUnix(),
					price: tradedPrice,
					quantity: tradedQuantity,
					from: counterParty,
					to: quote.orderId,
					side,
				}

				this.emit("transaction:new", tx);

				const transactionRecord: TransactionRecord = tx;

				transactionRecord["party1"] = { orderId: counterParty, side, quantity: tradedQuantity, price: tradedPrice };
				transactionRecord["party2"] = { orderId: quote.orderId, side: side === "ask" ? "bid" : "ask" };

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

		return { 
			trades
		}
	}

	processLimitOrder(quote: Quote) {
		let orderInBook = null;
		let createNewOrder = false;
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
					createNewOrder = true;
				}

				if (quantityToTrade > 0) {
					// creating new order since we have not yet filled the order
					if (createNewOrder) {
						quote.orderId = getUniqueId();
					}
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
					createNewOrder = true;
				}

				if (quantityToTrade > 0) {
					if (createNewOrder) {
						quote.orderId = getUniqueId();
					}
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

	cancelOrder(side: OrderSide, orderId: string) {
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

	modifyOrder(orderId: string, orderUpdate: Quote) {
		const { side } = orderUpdate;
		orderUpdate.orderId = orderId;
		orderUpdate.time = getCurrentUnix();

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

	getVolumeAtPrice(side: OrderSide, price: number) {
		let volume: BigNumber = new BigNumber(0);
		switch (side) {
			case "bid":
				const b = this.bids.getPrice(price);
				if (this.bids.priceExists(price) && b) {
					volume = b.volume;
				}
				break;

			case "ask":
				const a = this.asks.getPrice(price);
				if (this.asks.priceExists(price) && a) {
					volume = a.volume;
				}
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

	getSimpleBids() {
		const bids: SimpleBook["bids"] = [];
		this.bids.priceMap.forEach(order => bids.push({ price: order.key, volume: this.getVolumeAtPrice("bid", order.key).toNumber() }));
		return bids;
	}

	getSimpleAsks() {
		const asks: SimpleBook["asks"] = [];
		this.asks.priceMap.forEach(order => asks.push({ price: order.key, volume: this.getVolumeAtPrice("ask", order.key).toNumber() }));
		return asks;
	}

	getSimpleBook(): SimpleBook {
		return { bids: this.getSimpleBids(), asks: this.getSimpleAsks() };
	}

	toString() {
		let str = "\n*** Asks (btm small) ***\n";
		if (this.asks && this.asks.length > 0) {
			this.asks.priceMap.forEach((order) => (str += order.value.toString()));
		}

		str += "\n*** Bids (top big) ***\n";
		if (this.bids && this.bids.length > 0) {
			this.bids.priceMap.forEach((order) => (str += order.value.toString()));
		}

		str += "\n***Transactions (first 10)***\n";
		if (this.tape && this.tape.length > 0) {
			let num = 0;
			for (let entry of this.tape.toArray()) {
				if (num < 10) {
					str += `Trans: ${entry.price}x${entry.quantity} From: ${entry.party1?.orderId}, To: ${entry.party2?.orderId}\n`;
					num += 1;
				} else break;
			}
		}

		str += "\n";
		return str;
	}
}
