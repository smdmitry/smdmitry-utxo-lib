var bs58basecheck = require('./bs58basecheck')
var Buffer = require('safe-buffer').Buffer

'use strict'

const createBlakeHash = require('blake-hash')

var blake256 = function(data) {
    return createBlakeHash('blake256').update(data).digest()
}
var dubleblake256 = function (data) {
    return blake256(blake256(data));
}

var bs58check = bs58basecheck(dubleblake256)

function decodeRaw (array, version, versionLength) {
  let buffer = Buffer.from(array);
  versionLength = versionLength || 1;

  // check version only if defined
  if (version !== undefined) {
    versionLength = version > 0xff ? 2 : 1;

    if (
        (versionLength == 1 && buffer[0] !== version) ||
        (versionLength == 2 && buffer.readUInt16LE(0) !== version)
    ) throw new Error('Invalid network version')
  }

  let length = 33;
  if (versionLength == 2) {
    length = 34;
  }

  // uncompressed
  if (buffer.length === length) {
    return {
      version: versionLength == 2 ? buffer.readUInt16LE(0) : buffer[0],
      privateKey: buffer.slice(versionLength, length),
      compressed: false
    }
  }

  // invalid length
  if (buffer.length !== length + 1) throw new Error('Invalid WIF length')

  // invalid compression flag
  if (buffer[length] !== 0x01) throw new Error('Invalid compression flag')

  return {
    version: versionLength == 2 ? buffer.readUInt16LE(0) : buffer[0],
    privateKey: buffer.slice(versionLength, length),
    compressed: true
  }
}

function encodeRaw (version, privateKey, compressed) {
  if (privateKey.length !== 32) throw new TypeError('Invalid privateKey length')

  let length = 33;
  if (version > 0xff) {
    length = 34;
  }

  var result = Buffer.alloc(compressed ? length + 1 : length)

  if (version > 0xff) {
    result.writeUInt16LE(version, 0)
    privateKey.copy(result, 2)
  } else {
    result.writeUInt8(version, 0)
    privateKey.copy(result, 1)
  }

  if (compressed) {
    result[length] = 0x01
  }

  return result
}

function decode (string, version, versionLength = 1) {
  return decodeRaw(bs58check.decode(string), version, versionLength)
}

function encode (version, privateKey, compressed) {
  if (typeof version === 'number') return bs58check.encode(encodeRaw(version, privateKey, compressed))

  return bs58check.encode(
    encodeRaw(
      version.version,
      version.privateKey,
      version.compressed
    )
  )
}

module.exports = {
  decode: decode,
  decodeRaw: decodeRaw,
  encode: encode,
  encodeRaw: encodeRaw
}
