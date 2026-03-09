import Denque from "denque";
import { EventEmitter2 } from "eventemitter2";
import { defaultIdGenerator, getCurrentUnix, roundFloat } from "../lib/Helper.js";
import type {
	IdGenerator,
	OrderBookOptions,
	OrderQuote,
	OrderSide,
	Quote,
	SimpleBook,
	TransactionRecord,
} from "../types/index.js";
import type OrderList from "./OrderList.js";
import OrderTree from "./OrderTree.js";

export default class OrderBook {
	tape: Denque<TransactionRecord>;
	bids: OrderTree;
	asks: OrderTree;
	emitter: EventEmitter2 | null;
	private generateId: IdGenerator;

	constructor(options?: OrderBookOptions) {
		const enableEvents = options?.enableEvents ?? true;
		this.generateId = options?.idGenerator ?? defaultIdGenerator;
		this.tape = new Denque<TransactionRecord>();
		this.bids = new OrderTree(enableEvents);
		this.asks = new OrderTree(enableEvents);
		this.emitter = enableEvents ? new EventEmitter2({ wildcard: true, delimiter: ":" }) : null;
		if (this.emitter) {
			this.setupListeners();
		}
	}

	setupListeners() {
		this.bids.emitter?.onAny((event, value) => this.emitter?.emit(event, value));
		this.asks.emitter?.onAny((event, value) => this.emitter?.emit(event, value));
	}

	on(event: string, listener: (...args: unknown[]) => void) {
		this.emitter?.on(event, listener);
		return this;
	}

	off(event: string, listener: (...args: unknown[]) => void) {
		this.emitter?.off(event, listener);
		return this;
	}

	emit(event: string, ...args: unknown[]) {
		return this.emitter?.emit(event, ...args) ?? false;
	}

	onAny(listener: (event: string | string[], ...args: unknown[]) => void) {
		this.emitter?.onAny(listener);
		return this;
	}

	processOrder(qte: OrderQuote) {
		const { type: orderType, quantity } = qte;
		let orderInBook: Quote | null = null;
		let trades: TransactionRecord[] = [];

		if (quantity <= 0) {
			throw new Error("quantity must be greater than 0");
		}

		const quote: Quote = {
			...qte,
			time: getCurrentUnix(),
			orderId: this.generateId(),
		};

		switch (orderType) {
			case "market":
				trades = this.processMarketOrder(quote).trades;
				break;
			case "limit": {
				const result = this.processLimitOrder(quote);
				trades = result.trades;
				orderInBook = result.orderInBook;
				break;
			}
			default:
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

				const diff = roundFloat(headOrder.quantity - quantityToTrade);
				if (diff > 0) {
					tradedQuantity = quantityToTrade;
					newBookQuantity = diff;
					headOrder.updateQuantity(newBookQuantity, headOrder.time);
					quantityToTrade = 0;
				} else if (diff === 0) {
					tradedQuantity = quantityToTrade;
					quantityToTrade = 0;
					if (side === "bid") {
						this.bids.removeOrderById(headOrder.orderId);
					} else {
						this.asks.removeOrderById(headOrder.orderId);
					}
				} else {
					tradedQuantity = headOrder.quantity;
					quantityToTrade = roundFloat(quantityToTrade - tradedQuantity);
					if (side === "bid") {
						this.bids.removeOrderById(headOrder.orderId);
					} else {
						this.asks.removeOrderById(headOrder.orderId);
					}
				}

				const transactionRecord: TransactionRecord = {
					txId: this.generateId(),
					time: getCurrentUnix(),
					price: tradedPrice,
					quantity: tradedQuantity,
					party1: { orderId: counterParty, side, quantity: tradedQuantity, price: tradedPrice },
					party2: { orderId: quote.orderId, side: side === "ask" ? "bid" : "ask" },
				};

				this.emitter?.emit("transaction:new", transactionRecord);
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
		const trades: TransactionRecord[] = [];
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
			trades,
		};
	}

	processLimitOrder(quote: Quote) {
		let orderInBook: Quote | null = null;
		let createNewOrder = false;
		const trades: Array<TransactionRecord> = [];
		let quantityToTrade = quote.quantity;
		const { side, price } = quote;

		switch (side) {
			case "bid": {
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
					const newQuote: Quote = {
						...quote,
						orderId: createNewOrder ? this.generateId() : quote.orderId,
						quantity: quantityToTrade,
					};
					this.bids.insertOrder(newQuote);
					orderInBook = newQuote;
				}

				break;
			}

			case "ask": {
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
					const newQuote: Quote = {
						...quote,
						orderId: createNewOrder ? this.generateId() : quote.orderId,
						quantity: quantityToTrade,
					};
					this.asks.insertOrder(newQuote);
					orderInBook = newQuote;
				}

				break;
			}

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
				throw new Error("cancelOrder given neither 'bid' nor 'ask'");
		}
	}

	modifyOrder(orderId: string, orderUpdate: Quote) {
		const { side } = orderUpdate;
		const updated: Quote = {
			...orderUpdate,
			orderId,
			time: getCurrentUnix(),
		};

		switch (side) {
			case "bid":
				if (this.bids.orderExists(updated)) {
					this.bids.updateOrder(updated);
				}
				break;

			case "ask":
				if (this.asks.orderExists(updated)) {
					this.asks.updateOrder(updated);
				}
				break;

			default:
				throw new Error(`modifyOrder() given neither "bid" nor "ask"`);
		}
	}

	getVolumeAtPrice(side: OrderSide, price: number) {
		let volume = 0;
		switch (side) {
			case "bid": {
				const b = this.bids.getPrice(price);
				if (this.bids.priceExists(price) && b) {
					volume = b.volume;
				}
				break;
			}

			case "ask": {
				const a = this.asks.getPrice(price);
				if (this.asks.priceExists(price) && a) {
					volume = a.volume;
				}
				break;
			}

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
		this.bids.priceMap.forEachPair((price, orderList) => {
			bids.push({ price, volume: orderList.volume });
		});
		return bids;
	}

	getSimpleAsks() {
		const asks: SimpleBook["asks"] = [];
		this.asks.priceMap.forEachPair((price, orderList) => {
			asks.push({ price, volume: orderList.volume });
		});
		return asks;
	}

	getSimpleBook(): SimpleBook {
		return { bids: this.getSimpleBids(), asks: this.getSimpleAsks() };
	}

	toString() {
		let str = "\n*** Asks (btm small) ***\n";
		if (this.asks && this.asks.length > 0) {
			this.asks.priceMap.forEachPair((_price, orderList) => {
				str += orderList.toString();
			});
		}

		str += "\n*** Bids (top big) ***\n";
		if (this.bids && this.bids.length > 0) {
			this.bids.priceMap.forEachPair((_price, orderList) => {
				str += orderList.toString();
			});
		}

		str += "\n***Transactions (first 10)***\n";
		if (this.tape && this.tape.length > 0) {
			let num = 0;
			for (const entry of this.tape.toArray()) {
				if (num < 10) {
					str += `Trans: ${entry.price}x${entry.quantity} From: ${entry.party1.orderId}, To: ${entry.party2.orderId}\n`;
					num += 1;
				} else break;
			}
		}

		str += "\n";
		return str;
	}
}
