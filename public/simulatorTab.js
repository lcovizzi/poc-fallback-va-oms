document.getElementById("simulator").innerHTML = `
<h2>🧠 Simulador de Negócio</h2>

<style>
.card {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  background: #fafafa;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

button {
  padding: 6px 12px;
  margin-top: 10px;
  cursor: pointer;
}

.btn-danger {
  background: #dc3545;
  color: #fff;
  border: none;
}

.btn-secondary {
  background: #6c757d;
  color: #fff;
  border: none;
}

.btn-copy {
  background: #007bff;
  color: #fff;
  border: none;
  margin-bottom: 5px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.table th, .table td {
  border: 1px solid #ccc;
  padding: 6px;
  text-align: center;
}

.delivery-card {
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 10px;
  margin-top: 15px;
  background: #fff;
}

.error-card {
  border: 1px solid #dc3545;
  background: #fff5f5;
}

.item-card {
  display: grid;
  grid-template-columns: repeat(5, 1fr) auto;
  gap: 10px;
  margin-bottom: 10px;
}

details {
  margin-top: 10px;
}

pre {
  background: #111;
  color: #0f0;
  padding: 10px;
  overflow: auto;
  font-size: 12px;
  border-radius: 8px;
}
</style>

<!-- ================= API 1 ================= -->

<div class="card">
  <h3>📦 Simulação API 1 (Consulta)</h3>

  <div class="form-grid">
    <input id="sim1Store" placeholder="Loja">
    <input id="sim1Sku" placeholder="SKU">
    <input id="sim1Qty" type="number" placeholder="Qtd">
  </div>

  <button onclick="simApi1()">Simular API 1</button>

  <div id="sim1Result"></div>
</div>

<hr>

<!-- ================= API 2 ================= -->

<div class="card">
  <h3>🧾 Simulação API 2 (Confirmação)</h3>

  <div class="form-grid">
    <input id="sim2Store" placeholder="Loja">
    <input id="sim2Zip" placeholder="CEP">
  </div>

  <h4>Itens</h4>
  <div id="itemsContainer"></div>

  <button onclick="addItem()">➕ Adicionar Item</button>
  <button class="btn-danger" onclick="clearItems()">🧹 Limpar</button>
  <button onclick="simApi2()">Simular API 2</button>

  <div id="sim2Result"></div>
</div>
`;

let itemIndex = 1;
addItem();

/* =========================
   HELPERS
========================= */

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("Copiado!");
}

/* =========================
   API 1
========================= */

function simApi1() {
  const req = {
    salesOffice: sim1Store.value,
    oms: [{
      productId: sim1Sku.value,
      productUnitMeasure: "UN",
      productQuantity: Number(sim1Qty.value)
    }]
  };

  fetch("/logistic/options", {
    method: "POST",
    body: JSON.stringify(req)
  })
    .then(r => r.json())
    .then(d => {
      const item = d.data?.oms?.analyticSales?.sourcingGroup?.[0]?.items?.[0];

      if (!item) {
        sim1Result.innerHTML = `<p style="color:red">Erro na simulação</p>`;
        return;
      }

      const flows = item.outFlow.map(f => `<span>${f}</span>`).join(" ");

      const stockTable = `
        <table class="table">
          <tr>
            <th>Centro</th>
            <th>Depósito</th>
            <th>Qtd</th>
            <th>Plataforma</th>
          </tr>
          ${item.stockOnHand.map(s => `
            <tr>
              <td>${s.expeditionPlant}</td>
              <td>${s.storagePlant}</td>
              <td>${s.quantityAvailableProcess}</td>
              <td>${s.isPlatform}</td>
            </tr>
          `).join("")}
        </table>
      `;

      sim1Result.innerHTML = `
        <h4>🚚 Fluxos</h4>
        ${flows}

        <h4>📦 Estoque</h4>
        ${stockTable}

        <details>
          <summary><b>⚙️ Dados Técnicos</b></summary>

          <button class="btn-copy" onclick='copyToClipboard(\`${JSON.stringify(req, null, 2)}\`)'>📋 Copiar Request</button>
          <button class="btn-copy" onclick='copyToClipboard(\`${JSON.stringify(d.data, null, 2)}\`)'>📋 Copiar Response</button>

          <h4>Request</h4>
          <pre>${JSON.stringify(req, null, 2)}</pre>

          <h4>Response</h4>
          <pre>${JSON.stringify(d.data, null, 2)}</pre>

          <h4>Regra aplicada</h4>
          <pre>${d.explanation || "Sem explicação"}</pre>
        </details>
      `;
    });
}

/* =========================
   API 2
========================= */

function addItem() {
  const container = document.getElementById("itemsContainer");

  const id = itemIndex++;

  container.insertAdjacentHTML("beforeend", `
    <div class="item-card" id="item-${id}">
      <input placeholder="Fluxo (ED ou CX)" class="flow">
      <input placeholder="SKU" class="sku">
      <input placeholder="Qtd" type="number" class="qty">
      <input placeholder="Preço" type="number" class="price">
      <button class="btn-danger" onclick="removeItem(${id})">❌</button>
    </div>
  `);
}

function removeItem(id) {
  const el = document.getElementById("item-" + id);
  if (el) el.remove();
}

function clearItems() {
  document.getElementById("itemsContainer").innerHTML = "";
  addItem();
  sim2Result.innerHTML = "";
}

/* =========================
   EXECUÇÃO API 2
========================= */

function simApi2() {
  const itemsDOM = document.querySelectorAll(".item-card");

  let hasED = false;

  const items = Array.from(itemsDOM).map((el, index) => {
    const flow = el.querySelector(".flow").value;

    if (flow === "ED") hasED = true;

    return {
      externalId: "flow-" + (index + 1),
      typeDelivery: flow === "ED" ? "ED" : "CR",
      deliveryMethod: flow === "ED" ? "" : flow,
      storeId: flow === "ED" ? "" : sim2Store.value,
      productId: el.querySelector(".sku").value,
      productUnitMeasure: "UN",
      productUnitPrice: Number(el.querySelector(".price").value || 0),
      productQuantity: Number(el.querySelector(".qty").value)
    };
  });

  if (hasED && !sim2Zip.value) {
    alert("CEP obrigatório para ED");
    return;
  }

  const req = {
    salesOffice: sim2Store.value,
    destinationZipCode: sim2Zip.value,
    items
  };

  fetch("/logistic/confirm", {
    method: "POST",
    body: JSON.stringify(req)
  })
    .then(r => r.json())
    .then(d => {

      const data = d.data;

      // 🔴 ERRO
      if (data.statusProcess !== 200) {

        const errorList = (data.message || []).map(e => `
          <tr>
            <td>${e.externalId}</td>
            <td style="color:red">${e.message}</td>
          </tr>
        `).join("");

        sim2Result.innerHTML = `
          <div class="delivery-card error-card">
            <h3>❌ Erro na simulação</h3>

            <table class="table">
              <tr>
                <th>Item</th>
                <th>Motivo</th>
              </tr>
              ${errorList}
            </table>

            <details>
              <summary><b>⚙️ Dados Técnicos</b></summary>

              <button class="btn-copy" onclick='copyToClipboard(\`${JSON.stringify(req, null, 2)}\`)'>📋 Copiar Request</button>
              <button class="btn-copy" onclick='copyToClipboard(\`${JSON.stringify(data, null, 2)}\`)'>📋 Copiar Response</button>

              <h4>Request</h4>
              <pre>${JSON.stringify(req, null, 2)}</pre>

              <h4>Response</h4>
              <pre>${JSON.stringify(data, null, 2)}</pre>

              <h4>Regra aplicada</h4>
              <pre>${d.explanation || "Sem explicação"}</pre>
            </details>
          </div>
        `;

        return;
      }

      // 🟢 SUCESSO
      const deliveries = data?.sourcingGroup?.[0]?.delivery || [];

      const html = deliveries.map(del => {

        const itemsTable = del.items.map(i => `
          <tr>
            <td>${i.productId}</td>
            <td>${i.productQuantity}</td>
            <td>${i.stock.expeditionPlant}</td>
            <td>${i.stock.storagePlant}</td>
            <td>${i.sales.storeSale}</td>
            <td>${i.sales.warehouseSale}</td>
          </tr>
        `).join("");

        return `
          <div class="delivery-card">
            <h4>🚚 Entrega (${del.deliveryMethod})</h4>

            <p><b>📅 Data Promessa:</b> ${del.dateAvailable}</p>
            <p><b>🏬 Centro de Saída:</b> ${del.freight.modal[0].deliverySchedule[0].expeditionPlant}</p>

            <table class="table">
              <tr>
                <th>SKU</th>
                <th>Qtd</th>
                <th>Centro Estoque</th>
                <th>Depósito Estoque</th>
                <th>Centro Saída</th>
                <th>Depósito Saída</th>
              </tr>
              ${itemsTable}
            </table>
          </div>
        `;
      }).join("");

      sim2Result.innerHTML = `
        ${html}

        <details>
          <summary><b>⚙️ Dados Técnicos</b></summary>

          <button class="btn-copy" onclick='copyToClipboard(\`${JSON.stringify(req, null, 2)}\`)'>📋 Copiar Request</button>
          <button class="btn-copy" onclick='copyToClipboard(\`${JSON.stringify(data, null, 2)}\`)'>📋 Copiar Response</button>

          <h4>Request</h4>
          <pre>${JSON.stringify(req, null, 2)}</pre>

          <h4>Response</h4>
          <pre>${JSON.stringify(data, null, 2)}</pre>

          <h4>Regra aplicada</h4>
          <pre>${d.explanation || "Sem explicação"}</pre>
        </details>
      `;
    });
}