import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { getCollectedRevenue } from "./get-collected-revenue";

const now = new Date("2026-09-15T12:00:00Z");
const nowSeconds = now.getTime() / 1000;
const DAY = 24 * 60 * 60;

type TransactionOptions = {
  type?: Stripe.BalanceTransaction.Type;
  amount?: number;
  fee?: number;
  currency?: string;
  created?: number;
  paymentIntentId?: string | null;
};

function transaction({
  type = "charge",
  amount = 2400,
  fee = 0,
  currency = "eur",
  created = nowSeconds - DAY,
  paymentIntentId = null,
}: TransactionOptions = {}) {
  return {
    type,
    amount,
    fee,
    net: amount - fee,
    currency,
    created,
    source: paymentIntentId ? { payment_intent: paymentIntentId } : null,
  };
}

// An Invoice of 20 EUR excluding VAT, paid 24 EUR with 20% VAT.
function invoice({ total = 2400, tax = 400 } = {}) {
  return { total, total_taxes: [{ amount: tax }] };
}

function stripeStub(
  transactions: Array<ReturnType<typeof transaction>>,
  invoicesByPaymentIntent: Record<string, ReturnType<typeof invoice>> = {},
) {
  return {
    balanceTransactions: {
      list: () =>
        (async function* () {
          yield* transactions;
        })(),
    },
    invoicePayments: {
      list: ({ payment }: { payment: { payment_intent: string } }) => {
        const paid = invoicesByPaymentIntent[payment.payment_intent];
        return Promise.resolve({ data: paid ? [{ invoice: paid }] : [] });
      },
    },
  } as unknown as Stripe;
}

describe("getCollectedRevenue", () => {
  it("removes VAT from a charge paying an Invoice", async () => {
    const stripe = stripeStub([transaction({ paymentIntentId: "pi_1" })], {
      pi_1: invoice(),
    });

    await expect(getCollectedRevenue({ now }, stripe)).resolves.toMatchObject({
      current: 20,
    });
  });

  it("deducts refunds, excluding their VAT", async () => {
    const stripe = stripeStub(
      [
        transaction({ amount: 4800, paymentIntentId: "pi_1" }),
        transaction({
          type: "refund",
          amount: -2400,
          paymentIntentId: "pi_1",
        }),
      ],
      { pi_1: invoice({ total: 4800, tax: 800 }) },
    );

    await expect(getCollectedRevenue({ now }, stripe)).resolves.toMatchObject({
      current: 20,
    });
  });

  it("deducts processing fees and separately billed Stripe fees", async () => {
    const stripe = stripeStub(
      [
        transaction({ fee: 100, paymentIntentId: "pi_1" }),
        transaction({ type: "stripe_fee", amount: -50 }),
        transaction({ type: "tax_fee", amount: -25 }),
      ],
      { pi_1: invoice() },
    );

    await expect(getCollectedRevenue({ now }, stripe)).resolves.toMatchObject({
      current: 20 - 1 - 0.5 - 0.25,
    });
  });

  it("ignores payouts and other transactions that are not revenue", async () => {
    const stripe = stripeStub([
      transaction(),
      transaction({ type: "payout", amount: -2400 }),
      transaction({ type: "transfer", amount: -1000 }),
    ]);

    await expect(getCollectedRevenue({ now }, stripe)).resolves.toMatchObject({
      current: 24,
    });
  });

  it("splits the last 30 days from the 30 days before at the window boundaries", async () => {
    const stripe = stripeStub([
      transaction({ amount: 100, created: nowSeconds - 30 * DAY }),
      transaction({ amount: 200, created: nowSeconds - 30 * DAY - 1 }),
      transaction({ amount: 400, created: nowSeconds - 60 * DAY }),
      transaction({ amount: 800, created: nowSeconds - 60 * DAY - 1 }),
      transaction({ amount: 1600, created: nowSeconds }),
    ]);

    await expect(getCollectedRevenue({ now }, stripe)).resolves.toEqual({
      current: 1,
      previous: 6,
      nonEurTransactionCount: 0,
    });
  });

  it("counts a non-EUR transaction as a warning instead of summing it", async () => {
    const stripe = stripeStub([
      transaction(),
      transaction({ currency: "usd", amount: 5000 }),
    ]);

    await expect(getCollectedRevenue({ now }, stripe)).resolves.toEqual({
      current: 24,
      previous: 0,
      nonEurTransactionCount: 1,
    });
  });

  it("rejects on a Stripe failure instead of returning zeros", async () => {
    const outage = new Error("Stripe is unreachable");
    const stripe = {
      balanceTransactions: {
        list: () => ({
          [Symbol.asyncIterator]: () => ({
            next: () => Promise.reject(outage),
          }),
        }),
      },
    } as unknown as Stripe;

    await expect(getCollectedRevenue({ now }, stripe)).rejects.toBe(outage);
  });
});
