import { randomBytes, randomUUID } from "node:crypto";
import { bench, describe } from "vitest";

let counter = 0;

describe("ID generation strategies", () => {
	bench("crypto.randomBytes(5).toString('hex') - current getUniqueId", () => {
		for (let i = 0; i < 10_000; i++) {
			randomBytes(5).toString("hex");
		}
	});

	bench("crypto.randomBytes(13).toString('hex') - current getTxId", () => {
		for (let i = 0; i < 10_000; i++) {
			randomBytes(13).toString("hex");
		}
	});

	bench("crypto.randomUUID()", () => {
		for (let i = 0; i < 10_000; i++) {
			randomUUID();
		}
	});

	bench("monotonic counter (number)", () => {
		for (let i = 0; i < 10_000; i++) {
			counter++;
		}
	});

	bench("monotonic counter (string)", () => {
		for (let i = 0; i < 10_000; i++) {
			String(counter++);
		}
	});

	bench("Date.now() + counter", () => {
		for (let i = 0; i < 10_000; i++) {
			`${Date.now()}-${counter++}`;
		}
	});

	bench("Math.random().toString(36).slice(2, 12)", () => {
		for (let i = 0; i < 10_000; i++) {
			Math.random().toString(36).slice(2, 12);
		}
	});
});

describe("Timestamp strategies", () => {
	bench("Date.now() - current getCurrentUnix", () => {
		for (let i = 0; i < 100_000; i++) {
			Date.now();
		}
	});

	bench("performance.now()", () => {
		for (let i = 0; i < 100_000; i++) {
			performance.now();
		}
	});
});

describe("Object spread vs mutation", () => {
	const base = { type: "limit" as const, side: "bid" as const, quantity: 100, price: 99.5 };

	bench("spread to create quote - current pattern", () => {
		for (let i = 0; i < 100_000; i++) {
			const _q = { ...base, time: Date.now(), orderId: String(i) };
		}
	});

	bench("Object.assign", () => {
		for (let i = 0; i < 100_000; i++) {
			const _q = Object.assign({}, base, { time: Date.now(), orderId: String(i) });
		}
	});

	bench("direct construction", () => {
		for (let i = 0; i < 100_000; i++) {
			const _q = {
				type: base.type,
				side: base.side,
				quantity: base.quantity,
				price: base.price,
				time: Date.now(),
				orderId: String(i),
			};
		}
	});
});
