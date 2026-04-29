const mock = require("../mockData");

// 🔒 base (imutável)
const baseStock = [...mock.stock];
const baseLogistics = [...mock.logistics];

// 🔥 runtime
let runtimeStock = [];
let runtimeLogistics = [];

// GET FINAL
function getStock() {
  return [...baseStock, ...runtimeStock];
}

function getLogistics() {
  return [...baseLogistics, ...runtimeLogistics];
}

// ADD
function addStock(item) {
  runtimeStock.push(item);
}

function addLogistic(item) {
  runtimeLogistics.push(item);
}

// RESET
function reset() {
  runtimeStock = [];
  runtimeLogistics = [];
}

module.exports = {
  getStock,
  getLogistics,
  addStock,
  addLogistic,
  reset,
};