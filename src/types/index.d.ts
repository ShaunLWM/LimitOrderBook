type OrderSide = "bid" | "ask";
type OrderType = "limit" | "market";

interface BaseQuote {
	orderId: string;
	time: number;
}

interface LimitQuote {
	type: "limit";
	price: number;
	side: OrderSide;
	quantity: number;
}

interface MarketQuote {
	type: "market";
	price: never;
	side: OrderSide;
	quantity: number;
}

type OrderQuote = MarketQuote | LimitQuote;

type Quote = OrderQuote & BaseQuote;

type TransactionPartyDetail = Pick<Quote, "orderId" | "side" | "quantity" | "price">;

interface TransactionRecord {
	price: number;
	quantity: number;
	time: number;
	txId: string;
	party1?: TransactionPartyDetail;
	party2?: Omit<TransactionPartyDetail, "quantity" | "price">;
}

interface SimpleBookRecord {
	price: number;
	volume: number;
}

interface SimpleBook {
	bids: SimpleBookRecord[];
	asks: SimpleBookRecord[];
}