const { stock, logistics } = require("../mockData");
const stockEligibility = require("../services/stockEligibilityService");
const logisticUtils = require("../utils/logisticUtils");

exports.getOptions = (data) => {
  const salesOffice = data.salesOffice;
  const item = data.oms?.[0];

  if (!item) {
    return { error: "OMS inválido" };
  }

  // 🔥 pega todas as opções logísticas possíveis
  const possibleLogistics = logistics.filter(
    (l) => l.salesOffice === salesOffice
  );

  // 🔥 ESTOQUE BRUTO
  const allStock = stock.filter((s) => s.productId === item.productId);

  // 🔥 ESTOQUE ELEGÍVEL (MESMA REGRA DA API 2)
  const eligibleStock = stockEligibility.getEligibleStock(
    item.productId,
    possibleLogistics
  );

  // 🔥 fallback: local + externo continua existindo, mas agora filtrado
  const localStock = eligibleStock.filter((s) => s.center === salesOffice);

  const externalStock = eligibleStock.filter((s) => s.center !== salesOffice);

  const chosenStock = [...localStock, ...externalStock];

  if (chosenStock.length === 0) {
    return {
      error:
        allStock.length > 0
          ? "Estoque existente, porém não elegível para venda (restrição logística/plataforma)"
          : "Produto sem estoque para venda",
    };
  }

  const flows = logisticUtils.getFlows(logistics, salesOffice, chosenStock);

  return logisticUtils.buildResponse(item, chosenStock, flows);
};
