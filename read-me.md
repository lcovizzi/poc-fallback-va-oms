📦 README — POC Fallback Logístico VA
🎯 Objetivo

Esta POC tem como objetivo simular o comportamento de fallback logístico do VA (Venda Assistida), permitindo:

Validar regras de estoque
Simular fluxos logísticos
Testar cenários de venda sem dependência de sistemas externos
Acelerar o desenvolvimento do time com exemplos práticos
🧱 Arquitetura da POC

A aplicação foi estruturada de forma simples e modular:

/project
├── index.js → servidor HTTP (UI + rotas)
├── controllers/
│ └── logisticController.js
├── services/
│ ├── logisticService.js → API 1 (consulta)
│ └── confirmService.js → API 2 (confirmação)
├── mockData.js → massa de dados (estoque + logística)
🔌 APIs disponíveis
🟦 API 1 — Consulta de Opções Logísticas
📍 Endpoint
POST /logistic/options
🎯 Objetivo

Simular o comportamento de catálogo logístico, retornando:

Estoque disponível
Fluxos possíveis (ED, REA, CX, etc)
Origem do estoque
📥 Exemplo de Request
{
"customerId": "0035591349",
"oms": [
{
"productId": "89100221",
"productUnitMeasure": "UN",
"productQuantity": 1
}
],
"salesOffice": "0001"
}
📤 Exemplo de Response
{
"oms": {
"statusCode": 200,
"analyticSales": {
"sourcingGroup": [
{
"items": [
{
"productId": "89100221",
"outFlow": ["CX_0001", "REA_0001", "ED"],
"stockOnHand": []
}
]
}
]
}
}
}
⚙️ Regras implementadas
Consulta de estoque por:
Loja (salesOffice)
CD (0099)
Plataforma (0519)
Validação de:
Quantidade disponível
Tipo de estoque (PLATAFORMA vs CD)
Retorno dos fluxos possíveis baseado na estrutura logística
🟩 API 2 — Confirmação de Pedido
📍 Endpoint
POST /logistic/confirm
🎯 Objetivo

Simular o processamento logístico do pedido:

Validação final de estoque
Escolha do depósito
Geração de remessa (delivery)
Agrupamento de SKUs
📥 Exemplo de Request (multi-SKU)
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
"productQuantity": 5
},
{
"externalId": "flow-002",
"typeDelivery": "CR",
"deliveryMethod": "REI",
"storeId": "0001",
"productId": "89100222",
"productQuantity": 5
}
]
}
📤 Exemplo de Response (sucesso)
{
"statusProcess": 200,
"sourcingGroup": [
{
"blockId": "B1.A001",
"delivery": [
{
"deliveryMethod": "CX",
"items": [...]
},
{
"deliveryMethod": "REI",
"items": [...]
}
]
}
]
}
❌ Exemplo de Response (erro)
{
"statusProcess": 500,
"errorItems": [
{
"externalId": "flow-001"
}
],
"message": [
{
"message": "Saldo indisponível"
}
]
}
⚙️ Regras implementadas (API 2)
🔴 Fluxos sem split (implementados)
CX, REI, RII, RIA
✔️ Regras desses fluxos
Não permite split de estoque
Deve atender 100% da quantidade em um único depósito
Considera apenas:
Loja de saída (storeId)
Depósitos válidos vêm da estrutura logística
📦 Agrupamento de remessa

Os itens são agrupados por:

deliveryMethod + storeId

Gerando:

1 delivery = 1 fluxo + 1 loja
❌ Regras de erro
Estoque insuficiente
Não existe depósito válido
Não existe um único depósito com saldo suficiente
Fluxo não suportado
📊 Mock de dados

A POC utiliza dados mockados em:

mockData.js
Contém:
Estoque:
Produto
Centro
Depósito
Quantidade
Lote (quando aplicável)
Flag de plataforma
Estrutura logística:
Loja venda
Centro de estoque
Depósito
Fluxo (CX, ED, etc)
Tipo (LOJA / CD / PLATAFORMA)
🧪 Como testar
Via Browser (UI da POC)
Acessar o preview do CodeSandbox
Colar o JSON
Clicar em Enviar
Via Postman
API 1
POST /logistic/options
API 2
POST /logistic/confirm

Body → raw JSON

🚧 Próximos passos
🟡 1. Fluxo REA (Retira Agendada)
Permitir split de estoque
Trabalhar com múltiplos depósitos
Considerar prazo de preparação
🟢 2. Fluxo ED (Entrega Domicílio)
Split entre centros (loja + CD + plataforma)
Cálculo de prazo:
PrepDays
TransfDays
Simulação de frete
🔵 3. Evoluções futuras
Prioridade de estoque (ex: loja > CD > plataforma)
Reserva de estoque (decremento no mock)
Multi-entrega por pedido
SLA logístico
Simulação de transporte
💡 Observações
Esta POC não persiste dados
Não há controle de concorrência
IDs são gerados aleatoriamente
Foco 100% em validação de regras
🧠 Conclusão

Essa POC já representa:

✅ Um motor simplificado de OMS
✅ Regras reais de logística
✅ Base pronta para evolução incremental
