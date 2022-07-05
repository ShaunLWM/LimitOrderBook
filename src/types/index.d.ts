interface Quote {
	type: "limit" | "market";
	side: "ask" | "bid";
	quantity: number;
	price: number;
	orderId: string;
	time: number;
}

type SubmitQuote = Pick<Quote, "type" | "side" | "quantity" | "price">;

type MixedQuote = Quote | SubmitQuote;

interface TransactionRecord {
	price: number;
	quantity: number;
	time: number;
	txId: string;
	party1?: [string, "bid" | "ask", string, number | null];
	party2?: [string, "bid" | "ask", string | null, number | null];
}
