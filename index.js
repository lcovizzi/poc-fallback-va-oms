const http = require("http");
const fs = require("fs");
const path = require("path");

const logisticController = require("./controllers/logisticController");
const dataStore = require("./services/dataStore");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

const server = http.createServer((req, res) => {
  // ================= API =================

  if (req.method === "POST" && req.url === "/logistic/options") {
    return logisticController.getOptions(req, res);
  }

  if (req.method === "POST" && req.url === "/logistic/confirm") {
    return logisticController.confirmOrder(req, res);
  }

  if (req.method === "GET" && req.url === "/moc") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        stock: dataStore.getStock(),
        logistics: dataStore.getLogistics(),
      })
    );
  }

  if (req.method === "POST" && req.url === "/moc/stock") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      dataStore.addStock(JSON.parse(body));
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (req.method === "POST" && req.url === "/moc/logistic") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      dataStore.addLogistic(JSON.parse(body));
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  if (req.method === "POST" && req.url === "/moc/reset") {
    dataStore.reset();
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ================= STATIC =================

  let filePath =
    req.url === "/" ? "./public/index.html" : "./public" + req.url;

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "text/plain";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(8080, () => {
  console.log("🚀 Server rodando em http://localhost:8080");
});