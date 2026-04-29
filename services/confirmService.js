const { logistics } = require("../mockData");
const stockService = require("./stockEligibilityService");

// 🔧 utils
function generateId() {
  return Math.random().toString(36).substring(2, 12);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function isNoSplitFlow(flow) {
  return ["CX", "REI", "RII", "RIA"].includes(flow);
}

function findLogistics(item, salesOffice) {
  if (item.typeDelivery === "ED") {
    return logistics.filter(
      (l) => l.salesOffice === salesOffice && l.flow === "ED"
    );
  }

  return logistics.filter(
    (l) =>
      l.salesOffice === salesOffice &&
      l.outCenter === item.storeId &&
      l.flow === item.deliveryMethod
  );
}

// 🔥 SERVICE PRINCIPAL
exports.confirm = (data) => {
  const items = data.items || [];
  const salesOffice = data.salesOffice;

  const errorItems = [];
  const messages = [];
  const deliveriesMap = {};

  for (const item of items) {
    const possibleLogistics = findLogistics(item, salesOffice);

    if (possibleLogistics.length === 0) {
      errorItems.push({ externalId: item.externalId });

      messages.push({
        externalId: item.externalId,
        typeMsg: "E",
        classeMsg: "ZMMM_OMS",
        msgId: 164,
        message: `Nenhuma configuração logística encontrada para o fluxo ${
          item.deliveryMethod || item.typeDelivery
        }.`,
        systemLogic: "POC",
      });

      continue;
    }

    // 🔥 ESTOQUE BRUTO (antes de qualquer regra)
    const allStock = stockService.getAllStock(item.productId);

    // ❌ 1. SEM ESTOQUE
    if (allStock.length === 0) {
      errorItems.push({ externalId: item.externalId });

      messages.push({
        externalId: item.externalId,
        typeMsg: "E",
        classeMsg: "ZMMM_OMS",
        msgId: 164,
        message: `SKU ${item.productId}: sem estoque disponível no momento.`,
        systemLogic: "POC",
      });

      continue;
    }

    // 🚫 2. ESTOQUE EXISTE MAS NÃO É ELEGÍVEL
    const eligibleStock = stockService.getEligibleStock(
      item.productId,
      possibleLogistics
    );

    if (eligibleStock.length === 0) {
      errorItems.push({ externalId: item.externalId });

      messages.push({
        externalId: item.externalId,
        typeMsg: "E",
        classeMsg: "ZMMM_OMS",
        msgId: 164,
        message: `SKU ${item.productId}: estoque disponível, porém não elegível por restrição logística/plataforma para loja ${salesOffice}.`,
        systemLogic: "POC",
      });

      continue;
    }

    let availableStocks = eligibleStock;

    let allocation = [];

    // 🔥 SEM SPLIT
    if (isNoSplitFlow(item.deliveryMethod)) {
      const valid = availableStocks.find((s) => s.qty >= item.productQuantity);

      if (!valid) {
        errorItems.push({ externalId: item.externalId });

        messages.push({
          externalId: item.externalId,
          typeMsg: "E",
          classeMsg: "ZMMM_OMS",
          msgId: 164,
          message: `SKU ${item.productId}: saldo insuficiente para o fluxo ${item.deliveryMethod}. Solicitado ${item.productQuantity}.`,
          systemLogic: "POC",
        });

        continue;
      }

      allocation.push({ ...valid, usedQty: item.productQuantity });
    }

    // 🔥 COM SPLIT
    else {
      let remaining = item.productQuantity;

      for (const s of availableStocks) {
        if (remaining <= 0) break;

        const used = Math.min(s.qty, remaining);

        allocation.push({
          ...s,
          usedQty: used,
        });

        remaining -= used;
      }

      if (remaining > 0) {
        errorItems.push({ externalId: item.externalId });

        messages.push({
          externalId: item.externalId,
          typeMsg: "E",
          classeMsg: "ZMMM_OMS",
          msgId: 164,
          message: `SKU ${
            item.productId
          }: saldo insuficiente para atendimento. Solicitado ${
            item.productQuantity
          }, disponível ${item.productQuantity - remaining}.`,
          systemLogic: "POC",
        });

        continue;
      }
    }

    // 🔥 AGRUPAMENTO DE ENTREGA
    const key = `${item.deliveryMethod || "ED"}_${allocation[0].center}`;

    if (!deliveriesMap[key]) {
      const logisticRef = possibleLogistics[0];

      const totalDays =
        (logisticRef.prepDays || 0) + (logisticRef.transfDays || 0);

      const baseDate = formatDate(addDays(totalDays));

      deliveriesMap[key] = {
        dateAvailable: baseDate,
        deliveryId: generateId(),
        deliveryMethod: item.deliveryMethod || "ED",
        freight: {
          valueReferenceInvoice: 0,
          modal: [
            {
              modalityQuote: item.deliveryMethod || "ED",
              quotePrice: 0,
              deliverySchedule: [
                {
                  expeditionPlant: allocation[0].center,
                  startHour: "08:00:00",
                  endHour: "18:00:00",
                  baseDate,
                  slotId: generateId(),
                  slotDesc: "Comercial",
                  slotApplicationId: "COMERCIAL",
                  fallback: true,
                },
              ],
            },
          ],
        },
        items: [],
      };
    }

    // 🔥 ITENS
    allocation.forEach((a) => {
      deliveriesMap[key].items.push({
        externalId: item.externalId,
        internalId: generateId(),
        productId: item.productId,
        productUnitMeasure: item.productUnitMeasure,
        productQuantity: a.usedQty,
        attendanceModality: item.typeDelivery,
        typeProcessItem: "10",
        sales: {
          storeSale: a.center,
          warehouseSale: a.deposit,
          officeSale: salesOffice,
        },
        stock: {
          expeditionPlant: a.center,
          storagePlant: a.deposit,
          batchId: a.batchId || "",
        },
      });
    });
  }

  // 🔥 FINALIZAÇÃO COM ERRO
  if (errorItems.length > 0) {
    return {
      statusProcess: 500,
      sourcingGroup: [{ blockId: "", delivery: [] }],
      errorItems,
      message: messages,
    };
  }

  // 🔥 SUCESSO
  return {
    statusProcess: 200,
    sourcingGroup: [
      {
        blockId: "B1.A001",
        delivery: Object.values(deliveriesMap),
      },
    ],
  };
};
