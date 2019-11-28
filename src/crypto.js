var createHash = require('create-hash')
var groestlhash = require('groestl-hash-js')
var crypto = require('crypto')

const createBlakeHash = require('blake-hash')

var blake256 = function(data) {
    return createBlakeHash('blake256').update(data).digest()
}

function ripemd160 (buffer) {
  var hash = 'rmd160'
  var supportedHashes = crypto.getHashes()
  // some environments (electron) only support the long alias
  if (supportedHashes.indexOf(hash) === -1 && supportedHashes.indexOf('ripemd160') !== -1) {
    hash = 'ripemd160'
  }

  return createHash(hash).update(buffer).digest()
}

function sha1 (buffer) {
  return createHash('sha1').update(buffer).digest()
}

function sha256 (buffer) {
  return createHash('sha256').update(buffer).digest()
}

function hash160 (buffer) {
  return ripemd160(sha256(buffer))
}

function hash256 (buffer) {
  return sha256(sha256(buffer))
}

function groestl (buffer) {
  return Buffer(groestlhash.groestl_2(buffer, 1, 1))
}

function doubleblake256 (buffer) {
    return blake256(blake256(buffer))
}

function blakehash160 (buffer) {
    return ripemd160(blake256(buffer))
}

module.exports = {
  hash160: hash160,
  hash256: hash256,
  ripemd160: ripemd160,
  sha1: sha1,
  sha256: sha256,
  groestl: groestl,
  blakehash160: blakehash160,
  doubleblake256: doubleblake256
}
