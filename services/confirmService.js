const dataStore = require("./dataStore");
const stockService = require("./stockEligibilityService");

// ===============================
// UTILS
// ===============================
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

// ===============================
// LOGÍSTICA
// ===============================
function findLogistics(item, salesOffice) {
  const logistics = dataStore.getLogistics();

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

// ===============================
// ESCOLHE CENTRO DO SKU
// ===============================
function chooseBestCenter(item, eligibleStock) {
  const grouped = {};

  // agrupa por centro
  eligibleStock.forEach((s) => {
    if (!grouped[s.center]) grouped[s.center] = [];
    grouped[s.center].push(s);
  });

  const candidates = [];

  for (const center in grouped) {
    const total = grouped[center].reduce((sum, s) => sum + s.qty, 0);

    if (total >= item.productQuantity) {
      candidates.push({
        center,
        stock: grouped[center],
        total,
      });
    }
  }

  if (!candidates.length) return null;

  // 🔥 regra: prioriza maior estoque (pode evoluir depois)
  candidates.sort((a, b) => b.total - a.total);

  return candidates[0];
}

// ===============================
// SERVICE
// ===============================
exports.confirm = (data) => {
  try {
    const items = data.items || [];
    const salesOffice = data.salesOffice;

    const deliveriesMap = {};
    const errorItems = [];
    const messages = [];
    const explanation = [];

    for (const item of items) {
      explanation.push(`\n📦 SKU ${item.productId}`);

      const logistics = findLogistics(item, salesOffice);

      if (!logistics.length) {
        pushError(item, "Sem logística");
        continue;
      }

      const eligibleStock = stockService
        .getEligibleStock(item.productId, logistics)
        .filter((s) => s.qty > 0);

      if (!eligibleStock.length) {
        pushError(item, "Sem estoque");
        continue;
      }

      // ===============================
      // 🧠 ESCOLHE UM CENTRO
      // ===============================
      const chosen = chooseBestCenter(item, eligibleStock);

      if (!chosen) {
        pushError(item, "Nenhum centro atende");
        continue;
      }

      explanation.push(`→ Centro escolhido: ${chosen.center}`);

      let remaining = item.productQuantity;
      const allocation = [];

      // 🔀 split apenas dentro do MESMO CENTRO
      const sorted = [...chosen.stock].sort((a, b) => a.qty - b.qty);

      for (const s of sorted) {
        if (remaining <= 0) break;

        const used = Math.min(s.qty, remaining);

        allocation.push({
          ...s,
          usedQty: used,
        });

        remaining -= used;
      }

      if (remaining > 0) {
        pushError(item, "Saldo insuficiente");
        continue;
      }

      // ===============================
      // 🚚 ENTREGA (usa logística)
      // ===============================
      const logisticRef = logistics.find(
        (l) => l.stockCenter === chosen.center
      );

      if (!logisticRef) {
        pushError(item, "Logística não encontrada para centro");
        continue;
      }

      const flow = item.deliveryMethod || "ED";

      const key = `${flow}_${logisticRef.outCenter}`;

      if (!deliveriesMap[key]) {
        // 🔥 calcula SLA baseado em TODOS os centros usados
const usedCenters = [
  ...new Set(allocation.map((a) => a.center)),
];

let maxDays = 0;

usedCenters.forEach((center) => {
  const log = logistics.find((l) => l.stockCenter === center);

  if (!log) return;

  const total =
    (log.prepDays || 0) +
    (log.transfDays || 0);

  if (total > maxDays) {
    maxDays = total;
  }
});

const baseDate = formatDate(addDays(maxDays));

        deliveriesMap[key] = {
          dateAvailable: baseDate,
          deliveryId: generateId(),
          deliveryMethod: flow,
          freight: {
            valueReferenceInvoice: 0,
            modal: [
              {
                modalityQuote: flow,
                deliverySchedule: [
                  {
                    expeditionPlant: logisticRef.outCenter,
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
            storeSale: logisticRef.outCenter,
            warehouseSale: logisticRef.outDeposit, // 🔥 CORRETO
            officeSale: salesOffice,
          },
          stock: {
            expeditionPlant: a.center,
            storagePlant: a.deposit,
            batchId: a.batchId || "",
          },
        });
      });

      explanation.push("✔️ Item atendido");
    }

    if (errorItems.length > 0) {
      return {
        explanation: explanation.join("\n"),
        data: {
          statusProcess: 500,
          sourcingGroup: [{ blockId: "", delivery: [] }],
          errorItems,
          message: messages,
        },
      };
    }

    return {
      explanation: explanation.join("\n"),
      data: {
        statusProcess: 200,
        sourcingGroup: [
          {
            blockId: "B1.A001",
            delivery: Object.values(deliveriesMap),
          },
        ],
      },
    };

    function pushError(item, msg) {
      errorItems.push({ externalId: item.externalId });
      messages.push({ externalId: item.externalId, message: msg });
      explanation.push(`❌ ${msg}`);
    }
  } catch (err) {
    return {
      explanation: "Erro inesperado",
      data: {
        statusProcess: 500,
        sourcingGroup: [],
        errorItems: [],
        message: [{ message: err.message }],
      },
    };
  }
};