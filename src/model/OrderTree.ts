import BigNumber from "bignumber.js";
import { EventEmitter2 } from "eventemitter2";
import SortedBTree from "sorted-btree";
import type { Quote } from "../types/index.js";
import Order from "./Order.js";
import OrderList from "./OrderList.js";

type BTreeType<K, V> = SortedBTree.default<K, V>;
// biome-ignore lint/suspicious/noExplicitAny: CJS/ESM interop
const BTree = ((SortedBTree as any).default ??
  SortedBTree) as typeof SortedBTree.default;

export default class OrderTree {
  priceMap: BTreeType<number, OrderList>;
  orderMap: Map<string, Order>;
  numOrders: number;
  depth: number;
  volume: BigNumber;
  emitter: EventEmitter2 | null;

  constructor(enableEvents = true) {
    this.priceMap = new BTree<number, OrderList>(undefined, (a, b) => a - b);
    this.orderMap = new Map();
    this.numOrders = 0;
    this.depth = 0;
    this.volume = new BigNumber(0);
    this.emitter = enableEvents
      ? new EventEmitter2({ wildcard: true, delimiter: ":" })
      : null;
  }

  get length(): number {
    return this.orderMap.size;
  }

  getPriceList(price: number): OrderList | null {
    if (price === null) {
      return null;
    }

    return this.priceMap.get(price) ?? null;
  }

  getOrder(orderId: string) {
    return this.orderMap.get(orderId);
  }

  createPrice(price: number) {
    this.depth += 1;
    this.priceMap.set(price, new OrderList());
    this.emitter?.emit("price:new", { price });
  }

  removePrice(price: number) {
    this.depth -= 1;
    this.priceMap.delete(price);
    this.emitter?.emit("price:remove", { price });
  }

  priceExists(price: number) {
    return this.priceMap.has(price);
  }

  orderExists(order: Quote | string) {
    if (typeof order === "string") {
      return this.orderMap.has(order);
    }

    return this.orderMap.has(order.orderId);
  }

  insertOrder(quote: Quote) {
    if (this.orderExists(quote)) {
      this.removeOrderById(quote.orderId);
    }

    this.numOrders += 1;
    if (!this.priceMap.has(quote.price)) {
      this.createPrice(quote.price);
    }

    const orderList = this.priceMap.get(quote.price);
    if (!orderList) {
      throw new Error("OrderList not found after createPrice");
    }

    const order = new Order(quote, orderList);
    orderList.appendOrder(order);
    this.orderMap.set(order.orderId, order);
    this.volume = this.volume.plus(order.quantity);
    this.emitter?.emit("order:new", quote);
  }

  updateOrder(orderUpdate: Quote) {
    const order = this.orderMap.get(orderUpdate.orderId);
    if (!order) {
      throw new Error("Order does not exist");
    }

    const { quantity: originalQuantity } = order;
    if (orderUpdate.price !== order.price) {
      const orderList = this.priceMap.get(order.price);
      if (orderList) {
        orderList.removeOrder(order);
        if (orderList.length === 0) {
          this.removePrice(order.price);
        }
      }
      this.insertOrder(orderUpdate);
    } else {
      order.updateQuantity(orderUpdate.quantity, orderUpdate.time);
    }

    this.volume = this.volume.plus(order.quantity.minus(originalQuantity));
    this.emitter?.emit("order:update", orderUpdate);
  }

  removeOrderById(orderId: string) {
    this.numOrders -= 1;
    const order = this.orderMap.get(orderId);
    if (!order) {
      throw new Error("Order does not exist");
    }

    this.volume = this.volume.minus(order.quantity);
    order.orderList.removeOrder(order);
    if (order.orderList.length === 0) {
      this.removePrice(order.price);
    }
    this.orderMap.delete(orderId);
    this.emitter?.emit("order:remove", order);
  }

  maxPrice(): number | null {
    if (this.depth > 0) {
      return this.priceMap.maxKey() ?? null;
    }

    return null;
  }

  minPrice(): number | null {
    if (this.depth > 0) {
      return this.priceMap.minKey() ?? null;
    }

    return null;
  }

  maxPriceList() {
    const maxPrice = this.maxPrice();
    if (maxPrice !== null) {
      return this.getPriceList(maxPrice);
    }

    return null;
  }

  minPriceList() {
    const minPrice = this.minPrice();
    if (minPrice !== null) {
      return this.getPriceList(minPrice);
    }

    return null;
  }

  getPrice(price: number) {
    if (this.depth > 0) {
      return this.getPriceList(price);
    }

    return null;
  }
}
