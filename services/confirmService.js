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

function getSLA(log) {
  return (log.prepDays || 0) + (log.transfDays || 0);
}

// ===============================
// 🔥 NOVA REGRA
// ===============================
function canUseGlobalOutCenter(items) {
  const flows = new Set(
    items.map(i => i.deliveryMethod || "ED")
  );
  return flows.size === 1;
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
// 🧠 ESCOLHE OUTCENTER GLOBAL
// ===============================
function chooseBestOutCenter(itemsAnalysis) {
  const outMap = {};

  itemsAnalysis.forEach(({ item, logistics, eligibleStock }) => {
    logistics.forEach((log) => {
      const stockList = eligibleStock.filter(
        (s) => s.center === log.stockCenter
      );

      const total = stockList.reduce((sum, s) => sum + s.qty, 0);

      if (total >= item.productQuantity) {
        if (!outMap[log.outCenter]) {
          outMap[log.outCenter] = {
            count: 0,
            logs: [],
          };
        }

        outMap[log.outCenter].count++;
        outMap[log.outCenter].logs.push(log);
      }
    });
  });

  const totalItems = itemsAnalysis.length;

  const valid = Object.entries(outMap)
    .filter(([_, v]) => v.count === totalItems)
    .map(([out, v]) => {
      const maxSla = Math.max(...v.logs.map(getSLA));
      return { out, sla: maxSla };
    })
    .sort((a, b) => a.sla - b.sla);

  return valid.length ? valid[0].out : null;
}

// ===============================
// 🧠 ESCOLHE MELHOR CENTRO POR SKU
// ===============================
function chooseBestCenterPerSKU(item, logs, eligibleStock) {
  const candidates = [];

  logs.forEach((log) => {
    const stockList = eligibleStock.filter(
      (s) => s.center === log.stockCenter
    );

    const total = stockList.reduce((sum, s) => sum + s.qty, 0);

    if (total >= item.productQuantity) {
      candidates.push({
        log,
        stockList,
        sla: getSLA(log),
      });
    }
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.sla - b.sla);

  return candidates[0];
}

// ===============================
// 🔥 CONTROLE GLOBAL DE CONSUMO
// ===============================
const stockUsage = {};

function getAvailableQty(sku, center, deposit, originalQty) {
  const key = `${sku}_${center}_${deposit}`;
  const used = stockUsage[key] || 0;
  return originalQty - used;
}

function reserveStock(sku, center, deposit, qty) {
  const key = `${sku}_${center}_${deposit}`;
  if (!stockUsage[key]) stockUsage[key] = 0;
  stockUsage[key] += qty;
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

    // 🔥 reset controle por execução
    Object.keys(stockUsage).forEach(k => delete stockUsage[k]);

    // ===============================
    // ANALISE INICIAL
    // ===============================
    const itemsAnalysis = items.map((item) => {
      const logistics = findLogistics(item, salesOffice);

      const eligibleStock = stockService
        .getEligibleStock(item.productId, logistics)
        .filter((s) => s.qty > 0);

      return { item, logistics, eligibleStock };
    });

    // ===============================
    // GLOBAL
    // ===============================
    let bestOutCenter = null;

    if (canUseGlobalOutCenter(items)) {
      const candidate = chooseBestOutCenter(itemsAnalysis);

      if (candidate) {
        bestOutCenter = candidate;
        explanation.push(`🧠 OutCenter global escolhido: ${bestOutCenter}`);
      } else {
        explanation.push("🧠 Nenhum centro único atende todos → fallback por SKU");
      }
    } else {
      explanation.push("🧠 Múltiplos fluxos → sem outCenter global");
    }

    // ===============================
    // PROCESSAMENTO
    // ===============================
    for (const analysis of itemsAnalysis) {
      const { item, logistics, eligibleStock } = analysis;

      explanation.push(`\n📦 SKU ${item.productId}`);

      if (!logistics.length) {
        pushError(item, "Sem logística");
        continue;
      }

      if (!eligibleStock.length) {
        pushError(item, "Sem estoque");
        continue;
      }

      let validLogs = logistics;

      if (bestOutCenter) {
        validLogs = logistics.filter(
          (l) => l.outCenter === bestOutCenter
        );
      }

      let chosen = chooseBestCenterPerSKU(
        item,
        validLogs,
        eligibleStock
      );

      if (!chosen && bestOutCenter) {
        explanation.push("↩ fallback SKU → ignorando outCenter global");

        chosen = chooseBestCenterPerSKU(
          item,
          logistics,
          eligibleStock
        );
      }

      if (!chosen) {
        pushError(item, "Saldo insuficiente");
        continue;
      }

      // 🔥 NOVA VALIDAÇÃO GLOBAL DE ESTOQUE
      const totalAvailable = chosen.stockList.reduce((sum, s) => {
        return sum + getAvailableQty(item.productId, s.center, s.deposit, s.qty);
      }, 0);

      if (totalAvailable < item.productQuantity) {
        pushError(item, "Saldo insuficiente considerando outros itens");
        continue;
      }

      explanation.push(
        `→ Centro: ${chosen.log.stockCenter} (SLA ${chosen.sla} dias)`
      );

      let remaining = item.productQuantity;
      const allocation = [];

      for (const s of chosen.stockList) {
        if (remaining <= 0) break;

        const available = getAvailableQty(item.productId, s.center, s.deposit, s.qty);

        if (available <= 0) continue;

        const used = Math.min(available, remaining);

        reserveStock(item.productId, s.center, s.deposit, used);

        allocation.push({ ...s, usedQty: used });
        remaining -= used;
      }

      const flow = item.deliveryMethod || "ED";
      const key = `${flow}_${chosen.log.outCenter}`;

      if (!deliveriesMap[key]) {
        deliveriesMap[key] = {
          dateAvailable: null,
          deliveryId: generateId(),
          deliveryMethod: flow,
          freight: {
            valueReferenceInvoice: 0,
            modal: [
              {
                modalityQuote: flow,
                deliverySchedule: [
                  {
                    expeditionPlant: chosen.log.outCenter,
                    startHour: "08:00:00",
                    endHour: "18:00:00",
                    baseDate: null,
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
            storeSale: chosen.log.outCenter,
            warehouseSale: chosen.log.outDeposit,
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

    // ===============================
    // SLA FINAL
    // ===============================
    Object.values(deliveriesMap).forEach((delivery) => {
      const flow = delivery.deliveryMethod;

      const baseDate =
        flow === "ED" || flow === "REA"
          ? formatDate(addDays(1))
          : formatDate(new Date());

      delivery.dateAvailable = baseDate;
      delivery.freight.modal[0].deliverySchedule[0].baseDate = baseDate;
    });

    if (errorItems.length) {
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