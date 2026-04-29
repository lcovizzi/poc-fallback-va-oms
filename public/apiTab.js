document.getElementById("apis").innerHTML = `
<style>
  .api-container {
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  .api-card {
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 20px;
    background: #fafafa;
  }

  .api-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  textarea {
    width: 100%;
    height: 260px;
    font-family: monospace;
    font-size: 13px;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #ccc;
    resize: vertical;
  }

  pre {
    height: 260px;
    overflow: auto;
    background: #111;
    color: #0f0;
    padding: 10px;
    border-radius: 8px;
    font-size: 12px;
  }

  .explanation {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
  }

  .buttons {
    margin: 10px 0;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  button {
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: #007bff;
    color: white;
    font-size: 12px;
  }

  button.secondary {
    background: #6c757d;
  }

  button.danger {
    background: #dc3545;
  }

  h2 {
    margin-bottom: 10px;
  }

  h3 {
    margin-bottom: 10px;
  }
</style>

<div class="api-container">

  <h2>📦 APIs (DEV)</h2>

  <!-- ================= API 1 ================= -->
  <div class="api-card">
    <h3>API 1 - Logistic Options</h3>

    <div class="buttons">
      <button onclick="callApi1()">▶ Executar</button>
      <button onclick="copyText('req1')">📋 Copiar Req</button>
      <button onclick="copyPre('res1')">📋 Copiar Res</button>
      <button class="secondary" onclick="formatJson('req1')">✨ Formatar</button>
      <button class="danger" onclick="clearApi1()">🧹 Limpar</button>
    </div>

    <div class="api-grid">
      <textarea id="req1">
{
  "salesOffice": "0002",
  "oms": [{
    "productId": "89100224",
    "productUnitMeasure": "UN",
    "productQuantity": 5
  }]
}
      </textarea>

      <pre id="res1"></pre>
    </div>

    <h4>🧠 Explicação</h4>
    <pre id="exp1" class="explanation"></pre>
  </div>

  <!-- ================= API 2 ================= -->
  <div class="api-card">
    <h3>API 2 - Confirm Order</h3>

    <div class="buttons">
      <button onclick="callApi2()">▶ Executar</button>
      <button onclick="copyText('req2')">📋 Copiar Req</button>
      <button onclick="copyPre('res2')">📋 Copiar Res</button>
      <button class="secondary" onclick="formatJson('req2')">✨ Formatar</button>
      <button class="danger" onclick="clearApi2()">🧹 Limpar</button>
    </div>

    <div class="api-grid">
      <textarea id="req2">
{
  "salesOffice": "0001",
  "items": [
    {
      "externalId": "flow-001",
      "typeDelivery": "CR",
      "deliveryMethod": "CX",
      "storeId": "0001",
      "productId": "89100221",
      "productUnitMeasure": "UN",
      "productQuantity": 5
    }
  ]
}
      </textarea>

      <pre id="res2"></pre>
    </div>

    <h4>🧠 Explicação</h4>
    <pre id="exp2" class="explanation"></pre>
  </div>

</div>
`;

// ===============================
// 🚀 CALLS
// ===============================
function callApi1() {
  fetch("/logistic/options", {
    method: "POST",
    body: document.getElementById("req1").value
  })
    .then(r => r.json())
    .then(d => {
      exp1.innerText = d.explanation || "";
      res1.innerText = JSON.stringify(d.data, null, 2);
    })
    .catch(err => {
      res1.innerText = "Erro: " + err.message;
    });
}

function callApi2() {
  fetch("/logistic/confirm", {
    method: "POST",
    body: document.getElementById("req2").value
  })
    .then(r => r.json())
    .then(d => {
      exp2.innerText = d.explanation || "";
      res2.innerText = JSON.stringify(d.data, null, 2);
    })
    .catch(err => {
      res2.innerText = "Erro: " + err.message;
    });
}

// ===============================
// 🧰 UTIL
// ===============================
function copyText(id) {
  navigator.clipboard.writeText(document.getElementById(id).value);
}

function copyPre(id) {
  navigator.clipboard.writeText(document.getElementById(id).innerText);
}

function clearApi1() {
  req1.value = "";
  res1.innerText = "";
  exp1.innerText = "";
}

function clearApi2() {
  req2.value = "";
  res2.innerText = "";
  exp2.innerText = "";
}

function formatJson(id) {
  try {
    const el = document.getElementById(id);
    const parsed = JSON.parse(el.value);
    el.value = JSON.stringify(parsed, null, 2);
  } catch {
    alert("JSON inválido");
  }
}