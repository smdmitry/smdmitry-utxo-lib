// Coins supported by bitgo-bitcoinjs-lib
const typeforce = require('typeforce')

const coins = {
  BCH: 'bch',
  BSV: 'bsv',
  BTC: 'btc',
  BTG: 'btg',
  LTC: 'ltc',
  PPC: 'ppc',
  ZEC: 'zec',
  DASH: 'dash',
  LBTC: 'lbtc',
  GRS: 'grs'
}

coins.isBitcoin = function (network) {
  return typeforce.value(coins.BTC)(network.coin)
}

coins.isBitcoinCash = function (network) {
  return typeforce.value(coins.BCH)(network.coin)
}

coins.isBitcoinSV = function (network) {
  return typeforce.value(coins.BSV)(network.coin)
}

coins.isBitcoinGold = function (network) {
  return typeforce.value(coins.BTG)(network.coin)
}

coins.isDash = function (network) {
  return typeforce.value(coins.DASH)(network.coin)
}

coins.isLitecoin = function (network) {
  return typeforce.value(coins.LTC)(network.coin)
}

coins.isZcash = function (network) {
  return typeforce.value(coins.ZEC)(network.coin) || this.isZKSnark(network);
}

coins.isLightningBitcoinLBTC = function (network) {
    return typeforce.value(coins.LBTC)(network.coin)
}

coins.isZKSnark = function (network) {
  return network.consensusBranchId;
}

coins.hasTxDatetime = function (network) {
  return network.txdatetime;
}

coins.hasExtraPayload = function (network) {
  return network.txextrapayload || this.isDash(network);
}

coins.hasTxBlockhash = function (network) {
    return network.txblockhash;
}

coins.isGroestlcoin = function (network) {
  return typeforce.value(coins.GRS)(network.coin)
}

coins.isValidCoin = typeforce.oneOf(
  coins.isBitcoin,
  coins.isBitcoinCash,
  coins.isBitcoinSV,
  coins.isBitcoinGold,
  coins.isLitecoin,
  coins.isZcash,
  coins.isZKSnark,
  coins.isLightningBitcoinLBTC,
  coins.hasTxDatetime,
  coins.hasExtraPayload,
  coins.hasTxBlockhash,
  coins.isGroestlcoin,
)

module.exports = coins
