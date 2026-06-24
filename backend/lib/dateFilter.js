export function parsePeriod(periodStr) {
  if (!periodStr) return null;
  const cleanStr = periodStr.replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const parts = cleanStr.split(/\s+to\s+|\s+-\s+/i).map(p => p.trim());
  if (parts.length < 2) return null;
  const startDate = parseSingleDate(parts[0], parts[1]);
  const endDate = parseSingleDate(parts[1]);
  if (startDate && endDate) {
    return { startDate, endDate };
  }
  return null;
}

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

export function parseSingleDate(dateStr, contextStr = "") {
  if (!dateStr) return null;
  const clean = dateStr.toLowerCase().trim();
  
  // Try matching numeric date formats like DD/MM/YYYY or YYYY-MM-DD
  const numericMatch = clean.match(/(\d{1,4})[\/\-]\s*(\d{1,2})[\/\-]\s*(\d{1,4})/);
  if (numericMatch) {
    let p1 = parseInt(numericMatch[1]);
    let p2 = parseInt(numericMatch[2]);
    let p3 = parseInt(numericMatch[3]);
    let year, month, day;
    if (p1 > 31) {
      year = p1;
      month = p2 - 1;
      day = p3;
    } else {
      day = p1;
      month = p2 - 1;
      year = p3;
    }
    return new Date(year, month, day);
  }
  
  // Try matching wordy date formats like "May 13, 2026" or "13 May 2026"
  const cleanText = clean.replace(/[^a-z0-9\s,]/g, "");
  const tokens = cleanText.split(/[\s,]+/);
  let day = null;
  let month = null;
  let year = null;
  
  for (const token of tokens) {
    if (/^\d{4}$/.test(token)) {
      year = parseInt(token);
    } else if (/^\d{1,2}$/.test(token)) {
      day = parseInt(token);
    } else if (MONTHS[token] !== undefined) {
      month = MONTHS[token];
    }
  }
  
  if (year === null && contextStr) {
    const contextClean = contextStr.toLowerCase().replace(/[^a-z0-9\s,]/g, "").trim();
    const contextNumeric = contextClean.match(/(\d{1,4})[\/\-]\s*(\d{1,2})[\/\-]\s*(\d{1,4})/);
    if (contextNumeric) {
      let p1 = parseInt(contextNumeric[1]);
      let p3 = parseInt(contextNumeric[3]);
      year = p1 > 31 ? p1 : p3;
    } else {
      const contextTokens = contextClean.split(/[\s,]+/);
      for (const token of contextTokens) {
        if (/^\d{4}$/.test(token)) {
          year = parseInt(token);
          break;
        }
      }
    }
  }
  
  if (year === null) {
    year = new Date().getFullYear();
  }
  if (day !== null && month !== null && year !== null) {
    return new Date(year, month, day);
  }
  return null;
}

export function filterTransactionsByPeriod(transactions, periodStr) {
  if (!transactions || !Array.isArray(transactions)) return [];
  const range = parsePeriod(periodStr);
  if (!range) {
    return transactions.filter(t => t.date && !isNaN(new Date(t.date).getTime()));
  }
  
  const startMs = range.startDate.getTime() - (5 * 24 * 60 * 60 * 1000); // 5-day buffer before
  const endMs = range.endDate.getTime() + (5 * 24 * 60 * 60 * 1000);     // 5-day buffer after
  
  return transactions.filter(t => {
    if (!t.date) return false;
    const txDate = new Date(t.date);
    const txMs = txDate.getTime();
    if (isNaN(txMs)) return false;
    return txMs >= startMs && txMs <= endMs;
  });
}
