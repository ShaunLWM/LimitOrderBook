interface Quote {
	type: "limit" | "market";
	side: "ask" | "bid";
	quantity: number;
	price: number;
	tradeId: number;
	orderId: number;
	timestamp: number;
	type?: string;
}

interface TransactionRecord {
	timestamp: number;
	price: number;
	quantity: number;
	time: number;
	party1?: [number, "bid" | "ask", number, number | null];
	party2?: [number, "bid" | "ask", number | null, number | null];
}
