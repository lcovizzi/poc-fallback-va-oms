document.getElementById("moc").innerHTML = `
<h2>🧪 MOC - Simulador de Dados</h2>

<div class="moc-actions">
  <button onclick="loadMoc()">🔄 Recarregar</button>
  <button onclick="resetMoc()">♻️ Resetar MOC</button>
</div>

<hr/>

<h3>📦 Estoque</h3>

<table class="table">
  <thead>
    <tr>
      <th>SKU</th>
      <th>Centro</th>
      <th>Depósito</th>
      <th>Lote</th>
      <th>Qtd</th>
      <th>Plataforma</th>
    </tr>
  </thead>
  <tbody id="stockTable"></tbody>
</table>

<h4>➕ Adicionar Estoque</h4>

<div class="form-grid">
  <input id="sku" placeholder="SKU">
  <input id="center" placeholder="Centro">
  <input id="deposit" placeholder="Depósito">
  <input id="batch" placeholder="Lote">
  <input id="qty" type="number" placeholder="Quantidade">
  <select id="platform">
    <option value="N">Normal</option>
    <option value="Y">Plataforma</option>
  </select>
</div>

<button onclick="addStock()">Adicionar Estoque</button>

<hr/>

<h3>🚚 Logística</h3>

<table class="table">
  <thead>
    <tr>
      <th>Loja Venda</th>
      <th>Centro Origem</th>
      <th>Depósito Origem</th>
      <th>Tipo</th>
      <th>Fluxo</th>
      <th>Centro Destino</th>
      <th>Depósito Destino</th>
      <th>Prep</th>
      <th>Transf</th>
    </tr>
  </thead>
  <tbody id="logTable"></tbody>
</table>

<h4>➕ Adicionar Logística</h4>

<div class="form-grid">
  <input id="l_salesOffice" placeholder="Loja Venda">
  <input id="l_stockCenter" placeholder="Centro Origem">
  <input id="l_stockDeposit" placeholder="Depósito Origem">
  <input id="l_type" placeholder="Tipo (LOJA/CD/PLATAFORMA)">
  <input id="l_flow" placeholder="Fluxo (CX, ED, REA...)">
  <input id="l_outCenter" placeholder="Centro Destino">
  <input id="l_outDeposit" placeholder="Depósito Destino">
  <input id="l_prep" type="number" placeholder="PrepDays">
  <input id="l_transf" type="number" placeholder="TransfDays">
</div>

<button onclick="addLogistic()">Adicionar Logística</button>
`;


// ================= LOAD =================

function loadMoc() {
  fetch("/moc")
    .then(r => r.json())
    .then(d => {
      renderStock(d.stock);
      renderLogistics(d.logistics);
    });
}


// ================= RENDER =================

function renderStock(stock) {
  const sorted = [...stock].sort((a, b) =>
    a.productId.localeCompare(b.productId)
  );

  stockTable.innerHTML = sorted.map(s => `
    <tr>
      <td>${s.productId}</td>
      <td>${s.center}</td>
      <td>${s.deposit}</td>
      <td>${s.batchId || "-"}</td>
      <td>${s.qty}</td>
      <td>${s.isPlatform}</td>
    </tr>
  `).join("");
}

function renderLogistics(logistics) {
  logTable.innerHTML = logistics.map(l => `
    <tr>
      <td>${l.salesOffice}</td>
      <td>${l.stockCenter}</td>
      <td>${l.stockDeposit}</td>
      <td>${l.type}</td>
      <td>${l.flow}</td>
      <td>${l.outCenter}</td>
      <td>${l.outDeposit}</td>
      <td>${l.prepDays}</td>
      <td>${l.transfDays}</td>
    </tr>
  `).join("");
}


// ================= ADD =================

function addStock() {
  const payload = {
    productId: sku.value,
    center: center.value,
    deposit: deposit.value,
    batchId: batch.value || null,
    qty: Number(qty.value),
    isPlatform: platform.value
  };

  fetch("/moc/stock", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then(() => {
    clearStockForm();
    loadMoc();
  });
}

function addLogistic() {
  const payload = {
    salesOffice: l_salesOffice.value,
    stockCenter: l_stockCenter.value,
    stockDeposit: l_stockDeposit.value,
    type: l_type.value,
    flow: l_flow.value,
    outCenter: l_outCenter.value,
    outDeposit: l_outDeposit.value,
    prepDays: Number(l_prep.value || 0),
    transfDays: Number(l_transf.value || 0)
  };

  fetch("/moc/logistic", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then(() => {
    clearLogForm();
    loadMoc();
  });
}


// ================= RESET =================

function resetMoc() {
  fetch("/moc/reset", { method: "POST" }).then(loadMoc);
}


// ================= CLEAR =================

function clearStockForm() {
  sku.value = "";
  center.value = "";
  deposit.value = "";
  batch.value = "";
  qty.value = "";
}

function clearLogForm() {
  l_salesOffice.value = "";
  l_stockCenter.value = "";
  l_stockDeposit.value = "";
  l_type.value = "";
  l_flow.value = "";
  l_outCenter.value = "";
  l_outDeposit.value = "";
  l_prep.value = "";
  l_transf.value = "";
}


// INIT
loadMoc();