exports.hasBatch = (stock, productId) => {
  return stock.some((s) => s.productId === productId && s.batchId);
};

exports.getLocalStock = (stock, item, salesOffice, hasBatch) => {
  return stock.filter(
    (s) =>
      s.productId === item.productId &&
      s.center === salesOffice &&
      (hasBatch ? s.qty > 0 : s.qty >= item.productQuantity)
  );
};

exports.getExternalStock = (stock, logistics, item, salesOffice, hasBatch) => {
  const allowedCenters = logistics.filter(
    (l) => l.salesOffice === salesOffice && l.stockCenter !== salesOffice
  );

  let result = [];

  allowedCenters.forEach((cfg) => {
    const centerStock = stock.filter(
      (s) =>
        s.productId === item.productId &&
        s.center === cfg.stockCenter &&
        (hasBatch ? s.qty > 0 : s.qty >= item.productQuantity)
    );

    const hasPlatform = centerStock.some((s) => s.isPlatform === "Y");

    if (hasPlatform) {
      const allow = cfg.type === "PLATAFORMA" || cfg.type === "CD/PLATAFORMA";
      if (!allow) return;
    }

    result.push(...centerStock);
  });

  return result;
};
