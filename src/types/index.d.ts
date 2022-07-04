interface Quote {
	type: "limit" | "market";
	side: "ask" | "bid";
	quantity: number;
	price: number;
	orderId: string;
	timestamp: number;
}

type MixedQuote = Quote | Pick<Quote, "type" | "side" | "quantity" | "price">

interface TransactionRecord {
	timestamp: number;
	price: number;
	quantity: number;
	time: number;
	txId: string;
	party1?: [string, "bid" | "ask", string, number | null];
	party2?: [string, "bid" | "ask", string | null, number | null];
}
