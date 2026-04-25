export function redactPII(analysisData) {
  // Create a deep copy to avoid mutating the original data
  const redacted = JSON.parse(JSON.stringify(analysisData));

  // 1. Redact Account Holder Name (e.g., "John Doe" -> "J*** D***" or just "REDACTED")
  if (redacted.account_holder) {
    redacted.account_holder = "REDACTED";
  }

  // 2. Remove exact balances to prevent financial profiling
  delete redacted.opening_balance;
  delete redacted.closing_balance;
  delete redacted.total_credits;

  // 3. Redact sensitive info in transaction descriptions
  if (redacted.transactions && Array.isArray(redacted.transactions)) {
    redacted.transactions.forEach(t => {
      if (t.desc) {
        // Redact UPI IDs (e.g., user@okhdfcbank -> ***@upi)
        t.desc = t.desc.replace(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/g, "***@upi");
        
        // Redact 10+ digit numbers (likely account numbers, phone numbers, or Aadhar)
        t.desc = t.desc.replace(/\b\d{10,}\b/g, "**********");
        
        // Redact Email addresses
        t.desc = t.desc.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "***@***.***");
      }
    });
  }

  // 4. Mark as redacted so the UI knows
  redacted.is_redacted = true;

  return redacted;
}
