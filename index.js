const http = require("http");
const logisticController = require("./controllers/logisticController");

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/logistic/options") {
    return logisticController.getOptions(req, res);
  }

  if (req.method === "POST" && req.url === "/logistic/confirm") {
    return logisticController.confirmOrder(req, res);
  }

  // 🌐 UI POC EVOLUÍDA
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <html>
      <body style="font-family: Arial; padding: 20px">

        <h2>🚀 POC VA - Logística & Fallback Engine</h2>

        <div style="display: flex; gap: 30px; align-items: flex-start">

          <!-- API 1 -->
          <div style="width: 50%">
            <h3>📦 API 1 - Consulta (OMS 0)</h3>

            <textarea id="req1" rows="12" style="width: 100%">
{
  "customerId": "4000075576",
  "salesOffice": "0001",
  "oms": [
    {
      "productId": "89100221",
      "productUnitMeasure": "UN",
      "productQuantity": 5
    }
  ]
}
            </textarea>

            <br><br>
            <button onclick="callApi1()">Executar API 1</button>

            <pre id="res1"></pre>

            <h4>📘 Regra API 1</h4>
            <p>
              Retorna todos os estoques elegíveis + validação logística.<br>
              Produto ainda não sofre split de remessa — apenas simulação de disponibilidade.
            </p>
          </div>

          <!-- API 2 -->
          <div style="width: 50%">
            <h3>🧾 API 2 - Confirmação (OMS 1)</h3>

            <textarea id="req2" rows="12" style="width: 100%">
{
  "customerId": "4000075576",
  "salesOffice": "0001",
  "items": [
    {
      "externalId": "flow-001",
      "typeDelivery": "CR",
      "deliveryMethod": "CX",
      "storeId": "0001",
      "productId": "89100221",
      "productUnitMeasure": "UN",
      "productUnitPrice": 143.51,
      "productQuantity": 5
    }
  ]
}
            </textarea>

            <br><br>
            <button onclick="callApi2()">Executar API 2</button>

            <pre id="res2"></pre>

            <h4>📘 Regra API 2</h4>
            <p>
              Executa reserva real de estoque.<br>
              Aplica regras de split, plataforma, logística e validação de remessa.
            </p>
          </div>
        </div>

        <br><br>

        <button onclick="clearAll()">🧹 LIMPAR TUDO</button>

        <script>
          function callApi1() {
            fetch("/logistic/options", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: document.getElementById("req1").value
            })
            .then(r => r.json())
            .then(d => {
              document.getElementById("res1").innerText =
                JSON.stringify(d, null, 2);
            });
          }

          function callApi2() {
            fetch("/logistic/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: document.getElementById("req2").value
            })
            .then(r => r.json())
            .then(d => {
              document.getElementById("res2").innerText =
                JSON.stringify(d, null, 2);
            });
          }

          function clearAll() {
            document.getElementById("req1").value = "";
            document.getElementById("req2").value = "";
            document.getElementById("res1").innerText = "";
            document.getElementById("res2").innerText = "";
          }
        </script>

      </body>
    </html>
  `);
});

server.listen(8080, () => {
  console.log("🚀 Server rodando na porta 8080");
});