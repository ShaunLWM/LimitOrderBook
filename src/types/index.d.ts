interface Quote {
	type: "limit" | "market";
	side: "ask" | "bid";
	quantity: number;
	price: number;
	tradeId: string;
	orderId: number;
	timestamp: number;
}

type MixedQuote = Quote | Pick<Quote, "type" | "side" | "quantity" | "price">

interface TransactionRecord {
	timestamp: number;
	price: number;
	quantity: number;
	time: number;
	party1?: [string, "bid" | "ask", number, number | null];
	party2?: [string, "bid" | "ask", number | null, number | null];
}
