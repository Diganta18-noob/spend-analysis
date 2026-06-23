import { describe, it, expect } from "vitest";
import { redactPII } from "../piiRedactor.js";

describe("redactPII", () => {
  it("should redact account holder name to REDACTED", () => {
    const input = { account_holder: "John Doe", transactions: [] };
    const result = redactPII(input);
    expect(result.account_holder).toBe("REDACTED");
  });

  it("should remove opening_balance, closing_balance, total_credits", () => {
    const input = {
      opening_balance: 50000,
      closing_balance: 42000,
      total_credits: 12000,
      transactions: [],
    };
    const result = redactPII(input);
    expect(result.opening_balance).toBeUndefined();
    expect(result.closing_balance).toBeUndefined();
    expect(result.total_credits).toBeUndefined();
  });

  it("should mask UPI IDs in transaction descriptions", () => {
    const input = {
      transactions: [
        { desc: "Payment to user123@okhdfcbank for lunch", amount: 200 },
        { desc: "Paid abcxyz@ybl via PhonePe", amount: 350 },
      ],
    };
    const result = redactPII(input);
    expect(result.transactions[0].desc).toBe("Payment to ***@upi for lunch");
    expect(result.transactions[1].desc).toBe("Paid ***@upi via PhonePe");
  });

  it("should mask 10+ digit numbers (account numbers, phone, Aadhaar)", () => {
    const input = {
      transactions: [
        { desc: "Transfer to 12345678901234", amount: 5000 },
        { desc: "NEFT Ref 9876543210", amount: 1000 },
      ],
    };
    const result = redactPII(input);
    expect(result.transactions[0].desc).toBe("Transfer to **********");
    expect(result.transactions[1].desc).toBe("NEFT Ref **********");
  });

  it("should mask email addresses", () => {
    const input = {
      transactions: [
        { desc: "john.doe@example.com payment", amount: 100 },
      ],
    };
    const result = redactPII(input);
    expect(result.transactions[0].desc).toBe("***@***.*** payment");
  });

  it("should set is_redacted flag to true", () => {
    const input = { transactions: [] };
    const result = redactPII(input);
    expect(result.is_redacted).toBe(true);
  });

  it("should not mutate the original input", () => {
    const input = {
      account_holder: "Jane",
      opening_balance: 1000,
      transactions: [{ desc: "test@upi", amount: 10 }],
    };
    const original = JSON.parse(JSON.stringify(input));
    redactPII(input);
    expect(input).toEqual(original);
  });

  it("should handle missing or empty transactions gracefully", () => {
    expect(() => redactPII({})).not.toThrow();
    expect(() => redactPII({ transactions: [] })).not.toThrow();
    expect(() => redactPII({ transactions: null })).not.toThrow();
  });
});
