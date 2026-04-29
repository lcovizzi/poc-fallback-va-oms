const { logistics } = require("../mockData");
const stockService = require("./stockEligibilityService");

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

// 🔥 SERVICE
exports.confirm = (data) => {
  const items = data.items || [];
  const salesOffice = data.salesOffice;

  const errorItems = [];
  const messages = [];
  const deliveriesMap = {};

  let explanation = [];

  for (const item of items) {
    explanation.push(`\n📦 SKU ${item.productId}`);

    const possibleLogistics = findLogistics(item, salesOffice);

    explanation.push(
      `1. Configurações logísticas encontradas: ${possibleLogistics.length}`
    );

    if (possibleLogistics.length === 0) {
      errorItems.push({ externalId: item.externalId });

      explanation.push(`❌ Nenhuma configuração logística válida`);

      messages.push({
        externalId: item.externalId,
        message: "Sem configuração logística",
      });

      continue;
    }

    const allStock = stockService.getAllStock(item.productId);

    if (allStock.length === 0) {
      explanation.push(`❌ Sem estoque`);

      errorItems.push({ externalId: item.externalId });
      continue;
    }

    explanation.push(
      `2. Estoque total encontrado: ${allStock
        .map((s) => `${s.center}/${s.deposit} (${s.qty})`)
        .join(", ")}`
    );

    const eligibleStock = stockService.getEligibleStock(
      item.productId,
      possibleLogistics
    );

    if (eligibleStock.length === 0) {
      explanation.push(
        `❌ Estoque existe mas não pode ser utilizado (plataforma/logística)`
      );

      errorItems.push({ externalId: item.externalId });
      continue;
    }

    explanation.push(
      `3. Estoques elegíveis: ${eligibleStock
        .map((s) => `${s.center}/${s.deposit}`)
        .join(", ")}`
    );

    let allocation = [];

    if (isNoSplitFlow(item.deliveryMethod)) {
      explanation.push(`4. Fluxo sem split (${item.deliveryMethod})`);

      const valid = eligibleStock.find(
        (s) => s.qty >= item.productQuantity
      );

      if (!valid) {
        explanation.push(`❌ Nenhum depósito atende sozinho`);

        errorItems.push({ externalId: item.externalId });
        continue;
      }

      explanation.push(
        `✔️ Atendido pelo depósito ${valid.center}/${valid.deposit}`
      );

      allocation.push({ ...valid, usedQty: item.productQuantity });
    } else {
      explanation.push(`4. Fluxo com split permitido`);

      let remaining = item.productQuantity;

      for (const s of eligibleStock) {
        if (remaining <= 0) break;

        const used = Math.min(s.qty, remaining);

        allocation.push({ ...s, usedQty: used });

        explanation.push(
          `Consumindo ${used} de ${s.center}/${s.deposit}`
        );

        remaining -= used;
      }

      if (remaining > 0) {
        explanation.push(`❌ Estoque insuficiente mesmo com split`);

        errorItems.push({ externalId: item.externalId });
        continue;
      }
    }

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

  if (errorItems.length > 0) {
    return {
      explanation: explanation.join("\n"),
      statusProcess: 500,
      sourcingGroup: [{ blockId: "", delivery: [] }],
      errorItems,
      message: messages,
    };
  }

  return {
    explanation: explanation.join("\n"),
    statusProcess: 200,
    sourcingGroup: [
      {
        blockId: "B1.A001",
        delivery: Object.values(deliveriesMap),
      },
    ],
  };
};