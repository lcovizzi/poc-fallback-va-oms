const logisticService = require("../services/logisticService");
const confirmService = require("../services/confirmService");

// 🔥 API 1 - Consulta logística (OMS 0)
exports.getOptions = async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      // 🔧 evita erro quando body vem vazio
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

// 🔥 API 2 - Confirmação logística (OMS 1)
exports.confirmOrder = async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      // 🔧 evita erro quando body vem vazio
      const data = body ? JSON.parse(body) : {};

      const result = confirmService.confirm(data);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
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