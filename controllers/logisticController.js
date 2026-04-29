const logisticService = require("../services/logisticService");
const confirmService = require("../services/confirmService");
const dataStore = require("../services/dataStore");

// 🔥 API 1
exports.getOptions = async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const data = body ? JSON.parse(body) : {};

      const result = logisticService.getOptions(data);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Erro ao processar API 1",
          details: err.message,
        })
      );
    }
  });
};

// 🔥 API 2
exports.confirmOrder = async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const data = body ? JSON.parse(body) : {};

      const result = confirmService.confirm(data);

      // 🔥 DEBUG (pode remover depois)
      console.log("RESULT API 2 👉", result);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result)); // 👈 correto
    } catch (err) {
      console.error("ERRO API 2 👉", err);

      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Erro ao processar API 2",
          details: err.message,
        })
      );
    }
  });
};

// 🔥 GET MOC
exports.getMoc = (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      stock: dataStore.getStock(),
      logistics: dataStore.getLogistics(),
    })
  );
};

// 🔥 ADD STOCK
exports.addStock = (req, res) => {
  let body = "";

  req.on("data", (chunk) => (body += chunk));

  req.on("end", () => {
    const data = JSON.parse(body);
    dataStore.addStock(data);

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  });
};

// 🔥 ADD LOGISTIC
exports.addLogistic = (req, res) => {
  let body = "";

  req.on("data", (chunk) => (body += chunk));

  req.on("end", () => {
    const data = JSON.parse(body);
    dataStore.addLogistic(data);

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  });
};

// 🔥 RESET
exports.resetMoc = (req, res) => {
  dataStore.reset();

  res.writeHead(200);
  res.end(JSON.stringify({ success: true }));
};