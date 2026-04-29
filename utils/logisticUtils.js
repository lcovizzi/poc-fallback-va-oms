exports.getFlows = (logistics, salesOffice, stockList) => {
  let flows = [];

  stockList.forEach((s) => {
    const matches = logistics.filter(
      (l) =>
        l.salesOffice === salesOffice &&
        l.stockCenter === s.center &&
        l.stockDeposit === s.deposit
    );

    matches.forEach((f) => {
      if (f.flow === "ED") {
        flows.push("ED");
      } else {
        flows.push(`${f.flow}_${f.outCenter}`);
      }
    });
  });

  return [...new Set(flows)];
};

exports.buildResponse = (item, stockList, flows) => {
  return {
    oms: {
      statusCode: 200,
      analyticSales: {
        sourcingGroup: [
          {
            items: [
              {
                internalId: "00000000000000000001",
                productId: item.productId,
                productUnitMeasure: item.productUnitMeasure,
                productQuantity: item.productQuantity,
                outFlow: flows,
                stockOnHand: stockList.map((s) => ({
                  expeditionPlant: s.center,
                  storagePlant: s.deposit,
                  quantityAvailableProcess: s.qty,
                  isPlatform: s.isPlatform,
                  batchId: s.batchId || null,
                })),
              },
            ],
          },
        ],
      },
    },
  };
};
