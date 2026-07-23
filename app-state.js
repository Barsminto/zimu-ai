export function upsertQuote(quotes, quote) {
  const existing = quotes.find(
    (item) => item.merchantId === quote.merchantId && item.modelId === quote.modelId,
  );
  const nextQuote = {
    id: existing?.id ?? `quote-${crypto.randomUUID()}`,
    ...quote,
  };

  if (!existing) {
    return [nextQuote, ...quotes];
  }

  return quotes.map((item) => (item.id === existing.id ? nextQuote : item));
}

export function sortQuotes(quotes, direction = "default") {
  if (direction === "default") {
    return [...quotes].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }
  return [...quotes].sort((a, b) => {
    const aPrice = Number(a.inputPrice) + Number(a.outputPrice);
    const bPrice = Number(b.inputPrice) + Number(b.outputPrice);
    return direction === "high" ? bPrice - aPrice : aPrice - bPrice;
  });
}

export function filterQuotes(quotes, { query = "", brand = "all", model = "all" } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return quotes.filter((quote) => {
    const matchesQuery = !normalizedQuery || `${quote.merchantName || ""} ${quote.modelName || ""}`.toLowerCase().includes(normalizedQuery);
    const matchesBrand = brand === "all" || quote.brand === brand;
    const matchesModel = model === "all" || quote.modelId === model;
    return matchesQuery && matchesBrand && matchesModel;
  });
}

export function paginateQuotes(quotes, page = 1, pageSize = 20) {
  const totalPages = Math.max(1, Math.ceil(quotes.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: quotes.slice(start, start + pageSize), page: safePage, totalPages };
}
