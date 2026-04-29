const dataStore = require("./dataStore");

function getEligibleStock(productId, logistics) {
  const productStock = dataStore
    .getStock()
    .filter((s) => s.productId === productId && s.qty > 0);

  return productStock.filter((s) => {
    return logistics.some((l) => {
      const match =
        l.stockCenter === s.center && l.stockDeposit === s.deposit;

      if (!match) return false;

      if (s.isPlatform === "Y") {
        return l.type === "PLATAFORMA" || l.type === "CD/PLATAFORMA";
      }

      return true;
    });
  });
}

function getAllStock(productId) {
  return dataStore.getStock().filter((s) => s.productId === productId);
}

module.exports = {
  getEligibleStock,
  getAllStock,
};