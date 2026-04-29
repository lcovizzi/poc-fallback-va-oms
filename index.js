const http = require("http");
const logisticController = require("./controllers/logisticController");

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/logistic/options") {
    return logisticController.getOptions(req, res);
  }
  if (req.method === "POST" && req.url === "/logistic/confirm") {
    return logisticController.confirmOrder(req, res);
  }

  // UI com 2 APIs (preparado pra API 2)
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <html>
      <body>
        <h2>POC VA - Fallback</h2>

        <h3>API 1 - OMS 00</h3>
        <textarea id="req1" rows="10" cols="80">{}</textarea>
        <br>
        <button onclick="callApi1()">Enviar</button>
        <pre id="res1"></pre>

        <h3>API 2 - OMS 1</h3>
        <textarea id="req2" rows="10" cols="80">{}</textarea>
        <br>
        <button onclick="callApi2()">Enviar</button>
        <pre id="res2"></pre>

        <script>
          function callApi1() {
            fetch("/logistic/options", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: document.getElementById("req1").value
            })
            .then(r => r.json())
            .then(d => document.getElementById("res1").innerText = JSON.stringify(d, null, 2));
          }

          function callApi2() {
            fetch("/logistic/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: document.getElementById("req2").value
            })
            .then(r => r.json())
            .then(d => document.getElementById("res2").innerText = JSON.stringify(d, null, 2));
          }
        </script>
      </body>
    </html>
  `);
});

server.listen(8080, () => {
  console.log("🚀 Server rodando na porta 8080");
});
