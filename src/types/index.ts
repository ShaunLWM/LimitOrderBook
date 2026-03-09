export type OrderSide = "bid" | "ask";
export type OrderType = "limit" | "market";

export interface BaseQuote {
	orderId: string;
	time: number;
}

export interface LimitQuote {
	type: "limit";
	price: number;
	side: OrderSide;
	quantity: number;
}

export interface MarketQuote {
	type: "market";
	price: never;
	side: OrderSide;
	quantity: number;
}

export type OrderQuote = MarketQuote | LimitQuote;

export type Quote = OrderQuote & BaseQuote;

export type TransactionPartyDetail = Pick<Quote, "orderId" | "side" | "quantity" | "price">;

export interface TransactionRecord {
	price: number;
	quantity: number;
	time: number;
	txId: string;
	party1: TransactionPartyDetail;
	party2: Omit<TransactionPartyDetail, "quantity" | "price">;
}

export interface SimpleBookRecord {
	price: number;
	volume: number;
}

export interface SimpleBook {
	bids: SimpleBookRecord[];
	asks: SimpleBookRecord[];
}
