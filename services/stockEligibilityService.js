const { stock } = require("../mockData");

/**
 * Verifica se o estoque é elegível para uma lista de regras logísticas
 */
function getEligibleStock(productId, logistics) {
  const productStock = stock.filter((s) => s.productId === productId);

  const eligible = productStock.filter((s) => {
    return logistics.some((l) => {
      const matchCenter =
        l.stockCenter === s.center && l.stockDeposit === s.deposit;

      if (!matchCenter) return false;

      // 🔥 REGRA PLATAFORMA
      if (s.isPlatform === "Y") {
        return l.type === "PLATAFORMA" || l.type === "CD/PLATAFORMA";
      }

      return true;
    });
  });

  return eligible;
}

/**
 * Verifica estoque bruto (sem regras)
 */
function getAllStock(productId) {
  return stock.filter((s) => s.productId === productId);
}

module.exports = {
  getEligibleStock,
  getAllStock,
};
