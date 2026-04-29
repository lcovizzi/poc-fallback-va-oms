document.getElementById("simulator").innerHTML = `
<h2>🧠 Simulador de Negócio</h2>

<!-- ================= API 1 ================= -->

<div class="card">
  <h3>📦 Simulação API 1 (Consulta)</h3>

  <div class="form-grid">
    <input id="sim1Store" placeholder="Loja (salesOffice)">
    <input id="sim1Sku" placeholder="SKU">
    <input id="sim1Qty" type="number" placeholder="Quantidade">
  </div>

  <button onclick="simApi1()">Simular API 1</button>

  <div id="sim1Result"></div>
</div>

<hr>

<!-- ================= API 2 ================= -->

<div class="card">
  <h3>🧾 Simulação API 2 (Confirmação)</h3>

  <div class="form-grid">
    <input id="sim2Store" placeholder="Loja (salesOffice)">
    <input id="sim2Zip" placeholder="CEP (obrigatório p/ ED)">
  </div>

  <h4>Itens</h4>
  <div id="itemsContainer"></div>

  <button onclick="addItem()">➕ Adicionar Item</button>
  <button onclick="simApi2()">Simular API 2</button>

  <div id="sim2Result"></div>
</div>
`;

/* =========================
   INIT
========================= */

let itemIndex = 1;
addItem();

/* =========================
   API 1
========================= */

function simApi1() {
  fetch("/logistic/options", {
    method: "POST",
    body: JSON.stringify({
      salesOffice: sim1Store.value,
      oms: [{
        productId: sim1Sku.value,
        productUnitMeasure: "UN",
        productQuantity: Number(sim1Qty.value)
      }]
    })
  })
    .then(r => r.json())
    .then(d => {
      const item = d.data?.oms?.analyticSales?.sourcingGroup?.[0]?.items?.[0];

      if (!item) {
        sim1Result.innerHTML = `<p style="color:red">Erro na simulação</p>`;
        return;
      }

      // 🔥 Fluxos
      const flowsHtml = item.outFlow.map(f =>
        `<span class="badge">${f}</span>`
      ).join(" ");

      // 🔥 Estoque detalhado
      const stockHtml = `
        <table class="table">
          <tr>
            <th>Centro</th>
            <th>Depósito</th>
            <th>Lote</th>
            <th>Qtd</th>
            <th>Plataforma</th>
          </tr>
          ${item.stockOnHand.map(s => `
            <tr>
              <td>${s.expeditionPlant}</td>
              <td>${s.storagePlant}</td>
              <td>${s.batchId || "-"}</td>
              <td>${s.quantityAvailableProcess}</td>
              <td>${s.isPlatform}</td>
            </tr>
          `).join("")}
        </table>
      `;

      sim1Result.innerHTML = `
        <h4>🚚 Fluxos disponíveis</h4>
        ${flowsHtml}

        <h4>📦 Estoque disponível</h4>
        ${stockHtml}
      `;
    });
}

/* =========================
   API 2
========================= */

function addItem() {
  const container = document.getElementById("itemsContainer");

  const html = `
    <div class="item-card">
      <input placeholder="Fluxo (ex: ED ou CX)" class="flow">
      <input placeholder="SKU" class="sku">
      <input placeholder="Qtd" type="number" class="qty">
      <input placeholder="Preço" type="number" class="price">
    </div>
  `;

  container.insertAdjacentHTML("beforeend", html);
}

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

  // 🔥 validação CEP
  if (hasED && !sim2Zip.value) {
    alert("CEP é obrigatório quando existir fluxo ED");
    return;
  }

  fetch("/logistic/confirm", {
    method: "POST",
    body: JSON.stringify({
      customerId: "4000075576",
      destinationZipCode: sim2Zip.value || null,
      salesPerson: "61031986",
      salesOffice: sim2Store.value,
      items
    })
  })
    .then(r => r.json())
    .then(d => {
      const deliveries = d.data?.sourcingGroup?.[0]?.delivery || [];

      if (!deliveries.length) {
        sim2Result.innerHTML = `<p style="color:red">Sem atendimento</p>`;
        return;
      }

      // 🔥 Agrupamento visual por remessa
      const html = deliveries.map(del => `
        <div class="delivery-card">
          <h4>🚚 Fluxo: ${del.deliveryMethod}</h4>
          <p><b>Data promessa:</b> ${del.dateAvailable}</p>

          <table class="table">
            <tr>
              <th>SKU</th>
              <th>Qtd</th>
              <th>Centro</th>
              <th>Depósito</th>
              <th>Lote</th>
            </tr>

            ${del.items.map(i => `
              <tr>
                <td>${i.productId}</td>
                <td>${i.productQuantity}</td>
                <td>${i.stock.expeditionPlant}</td>
                <td>${i.stock.storagePlant}</td>
                <td>${i.stock.batchId || "-"}</td>
              </tr>
            `).join("")}
          </table>
        </div>
      `).join("");

      sim2Result.innerHTML = html;
    });
}