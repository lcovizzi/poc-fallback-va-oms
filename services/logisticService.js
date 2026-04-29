const { stock, logistics } = require("../mockData");
const stockEligibility = require("../services/stockEligibilityService");
const logisticUtils = require("../utils/logisticUtils");

exports.getOptions = (data) => {
  const salesOffice = data.salesOffice;
  const item = data.oms?.[0];

  if (!item) {
    return {
      explanation: "Erro: OMS inválido.",
      data: { error: "OMS inválido" },
    };
  }

  const productId = item.productId;

  // 🔥 LOG EXPLICATIVO
  let explanationSteps = [];

  explanationSteps.push(
    `1. Buscando configurações logísticas para a loja ${salesOffice}.`
  );

  const possibleLogistics = logistics.filter(
    (l) => l.salesOffice === salesOffice
  );

  explanationSteps.push(
    `2. Foram encontradas ${possibleLogistics.length} configurações logísticas.`
  );

  const allStock = stock.filter((s) => s.productId === productId);

  if (allStock.length === 0) {
    explanationSteps.push(
      `3. Não existe estoque para o SKU ${productId}.`
    );

    return {
      explanation: explanationSteps.join("\n"),
      data: { error: "Produto sem estoque para venda" },
    };
  }

  explanationSteps.push(
    `3. Estoque encontrado para o SKU ${productId}: ${allStock
      .map((s) => `${s.center}/${s.deposit} (${s.qty})`)
      .join(", ")}`
  );

  const eligibleStock = stockEligibility.getEligibleStock(
    productId,
    possibleLogistics
  );

  if (eligibleStock.length === 0) {
    explanationSteps.push(
      `4. Existe estoque, porém nenhum é elegível devido a restrições logísticas/plataforma.`
    );

    return {
      explanation: explanationSteps.join("\n"),
      data: {
        error:
          "Estoque existente, porém não elegível para venda (restrição logística/plataforma)",
      },
    };
  }

  explanationSteps.push(
    `4. Estoques elegíveis: ${eligibleStock
      .map((s) => `${s.center}/${s.deposit}`)
      .join(", ")}`
  );

  const localStock = eligibleStock.filter((s) => s.center === salesOffice);
  const externalStock = eligibleStock.filter((s) => s.center !== salesOffice);

  explanationSteps.push(
    `5. Separação: Local (${localStock.length}) | Externo (${externalStock.length})`
  );

  const chosenStock = [...localStock, ...externalStock];

  const flows = logisticUtils.getFlows(logistics, salesOffice, chosenStock);

  explanationSteps.push(
    `6. Fluxos disponíveis: ${flows.join(", ")}`
  );

  explanationSteps.push(
    `✔️ Sucesso: Produto pode ser vendido pois há estoque elegível e configuração logística válida.`
  );

  const response = logisticUtils.buildResponse(item, chosenStock, flows);

  return {
    explanation: explanationSteps.join("\n"),
    data: response,
  };
};