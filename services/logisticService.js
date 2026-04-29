const dataStore = require("./dataStore");
const stockEligibility = require("./stockEligibilityService");
const logisticUtils = require("../utils/logisticUtils");

function buildError(externalId, message, steps) {
  return {
    explanation: steps.join("\n"),
    data: {
      sourcingGroup: [{ blockId: "", delivery: [] }],
      errorItems: [{ externalId }],
      message: [{ externalId, message }],
    },
  };
}

exports.getOptions = (data) => {
  const salesOffice = data.salesOffice;
  const item = data.oms?.[0];
  const externalId = "flow-001";

  let steps = [];

  if (!item) return buildError(externalId, "OMS inválido", ["❌ OMS inválido"]);

  const logistics = dataStore.getLogistics();
  const stock = dataStore.getStock();

  steps.push(`1. Buscando configurações da loja ${salesOffice}`);

  const possible = logistics.filter((l) => l.salesOffice === salesOffice);

  steps.push(`2. ${possible.length} configurações encontradas`);

  const allStock = stock.filter((s) => s.productId === item.productId);

  if (!allStock.length)
    return buildError(
      externalId,
      "Sem estoque",
      ["❌ Produto sem estoque"]
    );

  steps.push(
    `3. Estoque: ${allStock
      .map((s) => `${s.center}/${s.deposit} (${s.qty})`)
      .join(", ")}`
  );

  const eligible = stockEligibility.getEligibleStock(
    item.productId,
    possible
  );

  if (!eligible.length)
    return buildError(
      externalId,
      "Não elegível",
      ["❌ Estoque não elegível"]
    );

  steps.push(
    `4. Elegíveis: ${eligible
      .map((s) => `${s.center}/${s.deposit}`)
      .join(", ")}`
  );

  const flows = logisticUtils.getFlows(
    dataStore.getLogistics(),
    salesOffice,
    eligible
  );

  if (!flows.length)
    return buildError(externalId, "Sem fluxo", ["❌ Sem fluxo"]);

  steps.push(`5. Fluxos: ${flows.join(", ")}`);

  const response = logisticUtils.buildResponse(item, eligible, flows);

  return {
    explanation: steps.join("\n"),
    data: response,
  };
};