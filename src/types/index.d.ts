type OrderSide = "bid" | "ask";

interface Quote {
	type: "limit" | "market";
	side: OrderSide;
	quantity: number;
	price: number;
	orderId: string;
	time: number;
}

type SubmitQuote = Pick<Quote, "type" | "side" | "quantity" | "price">;

type MixedQuote = Quote | SubmitQuote;

type TransactionPartyDetail = Pick<Quote, "orderId" | "side" | "quantity" | "price">;

interface TransactionRecord {
	price: number;
	quantity: number;
	time: number;
	txId: string;
	party1?: TransactionPartyDetail;
	party2?: Omit<TransactionPartyDetail, "quantity" | "price">;
}
