var crypto = require('./crypto')
var base58 = require('bs58');
var xor = require('buffer-xor');
var compare = require('buffer-compare');

var multichain = {};

multichain.fromWIF = function(wif, privateKeyVersion, checksumValue) {
    var logger = {log: console.log};
    let originalPrivateKeyVersion = privateKeyVersion;
    privateKeyVersion = typeof privateKeyVersion === 'number' ? multichain.bytesBufferFromNumber(privateKeyVersion) : privateKeyVersion;
    checksumValue = typeof checksumValue === 'number' ? multichain.bytesBufferFromNumber(checksumValue) : checksumValue;

    // --

    privateKeyVersion = Buffer.isBuffer(privateKeyVersion) ? privateKeyVersion : Buffer.from(privateKeyVersion, 'hex');
    checksumValue = Buffer.isBuffer(checksumValue) ? checksumValue : Buffer.from(checksumValue, 'hex');

    var decodedWIF = new Buffer(base58.decode(wif));
    logger.log('[from WIF]', 'decoded WIF', decodedWIF.toString('hex'));

    var extractedChecksum = decodedWIF.slice(decodedWIF.length - checksumValue.length),
        extendedPrivateKey = decodedWIF.slice(0, decodedWIF.length - checksumValue.length),
        generatedChecksum = multichain.generateChecksum(extendedPrivateKey, checksumValue.length),
        xorChecksum = xor(generatedChecksum, checksumValue);

    logger.log('[from WIF]', 'extracted checksum', extractedChecksum.toString('hex'));
    logger.log('[from WIF]', 'extended private key', extendedPrivateKey.toString('hex'));

    logger.log('[from WIF]', 'generated checksum', generatedChecksum.toString('hex'));
    logger.log('[from WIF]', 'xor checksum', xorChecksum.toString('hex'));

    if (compare(extractedChecksum, xorChecksum) !== 0) {
        throw new Error('Extracted checksum and generated checksum do not match (' + extractedChecksum.toString('hex') + ', ' + xorChecksum.toString('hex') + ')');
    }

    var extractedData = multichain.extractVersion(extendedPrivateKey, privateKeyVersion.length, 8);

    if (compare(extractedData['version'], privateKeyVersion) !== 0) {
        throw new Error('Extracted private key does not match the given private key (' + extractedData['version'].toString('hex') + ', ' + privateKeyVersion.toString('hex') + ')');
    }

    var privateKey = extractedData['hash'],
        compressed = false;

    logger.log('[from WIF]', 'extracted private key', privateKey.toString('hex'));

    if (privateKey.length !== 32) {
        if (privateKey.length === 33 && privateKey[32] === 1) {
            compressed = true;
            privateKey = privateKey.slice(0, 32);
        } else {
            throw new Error('Private key length invalid ' + privateKey.length + ' bytes');
        }
    }

    return {
        privateKey: privateKey,
        compressed: compressed,
        version: originalPrivateKeyVersion
    };
}

multichain.toWIF = function(privateKey, compressed, privateKeyVersion, checksumValue) {
    var logger = {log: console.log};
    privateKeyVersion = typeof privateKeyVersion === 'number' ? multichain.bytesBufferFromNumber(privateKeyVersion) : privateKeyVersion;
    checksumValue = typeof checksumValue === 'number' ? multichain.bytesBufferFromNumber(checksumValue) : checksumValue;

    // ---

    privateKeyVersion = Buffer.isBuffer(privateKeyVersion) ? privateKeyVersion : Buffer.from(privateKeyVersion, 'hex');
    checksumValue = Buffer.isBuffer(checksumValue) ? checksumValue : Buffer.from(checksumValue, 'hex');

    privateKey = Buffer.from(privateKey);

    logger.log('[to WIF]', 'private key', privateKey.toString('hex'));

    if (compressed) {
        privateKey = Buffer.concat([privateKey, Buffer.from('01', 'hex')]);
        logger.log('[to WIF]', 'add compressed flag', privateKey.toString('hex'));
    }

    var extendedPrivateKey = multichain.extendWithVersion(privateKey, privateKeyVersion, 8);

    logger.log('[to WIF]', 'extended private key', extendedPrivateKey.toString('hex'));

    var checksum = multichain.generateChecksum(extendedPrivateKey, checksumValue.length),
        xorChecksum = xor(checksum, checksumValue);

    logger.log('[to WIF]', 'checksum', checksum.toString('hex'));
    logger.log('[to WIF]', 'xor checksum', xorChecksum.toString('hex'));

    var decodedWIF = Buffer.concat([extendedPrivateKey, xorChecksum]);
    logger.log('[to WIF]', 'decoded WIF', decodedWIF.toString('hex'));

    var encodedWIF = base58.encode(decodedWIF);

    logger.log('[to WIF]', 'encoded WIF', encodedWIF);

    return encodedWIF;
}

multichain.getAddressFromPK = function (pubKey, pubKeyHashVersion, checksumValue) {
    var logger = {log: console.log};
    pubKeyHashVersion = typeof pubKeyHashVersion === 'number' ? multichain.bytesBufferFromNumber(pubKeyHashVersion) : pubKeyHashVersion;
    checksumValue = typeof checksumValue === 'number' ? multichain.bytesBufferFromNumber(checksumValue) : checksumValue;

    // ---

    pubKeyHashVersion = Buffer.isBuffer(pubKeyHashVersion) ? pubKeyHashVersion : Buffer.from(pubKeyHashVersion, 'hex');
    checksumValue = Buffer.isBuffer(checksumValue) ? checksumValue : Buffer.from(checksumValue, 'hex');

    logger.log('[Generate address]', 'public key', pubKey.toString('hex'));

    return multichain.getAddressFromPKH(crypto.ripemd160(crypto.sha256(pubKey)), pubKeyHashVersion, checksumValue);
}

multichain.getAddressFromPKH = function (pubKeyHash, pubKeyHashVersion, checksumValue) {
    var logger = {log: console.log};
    pubKeyHashVersion = typeof pubKeyHashVersion === 'number' ? multichain.bytesBufferFromNumber(pubKeyHashVersion) : pubKeyHashVersion;
    checksumValue = typeof checksumValue === 'number' ? multichain.bytesBufferFromNumber(checksumValue) : checksumValue;

    // ---

    pubKeyHashVersion = Buffer.isBuffer(pubKeyHashVersion) ? pubKeyHashVersion : Buffer.from(pubKeyHashVersion, 'hex');
    checksumValue = Buffer.isBuffer(checksumValue) ? checksumValue : Buffer.from(checksumValue, 'hex');

    logger.log('[Generate address]', 'public key hash', pubKeyHash.toString('hex'));

    var extendedRipemd160 = multichain.extendWithVersion(pubKeyHash, pubKeyHashVersion, 5);

    logger.log('[Generate address]', 'public key hash value', pubKeyHashVersion.toString('hex'));
    logger.log('[Generate address]', 'extended ripemd160', extendedRipemd160.toString('hex'));

    var checksum = multichain.generateChecksum(extendedRipemd160, checksumValue.length),
        xorChecksum = xor(checksum, checksumValue);
    logger.log('[Generate address]', 'checksum', checksum.toString('hex'));
    logger.log('[Generate address]', 'xor checksum', xorChecksum.toString('hex'));

    var decodedAddress = Buffer.concat([extendedRipemd160, xorChecksum]);
    logger.log('[Generate address]', 'decoded address', decodedAddress.toString('hex'));

    var encodedAddress = base58.encode(decodedAddress);

    logger.log('[Generate address]', 'encoded address', encodedAddress);

    return encodedAddress;
}

multichain.bytesBufferFromNumber = function (number) {
    return Buffer.from(number.toString(16), 'hex');
}

multichain.generateChecksum = function(extendedHash, checksumLength) {
    return crypto.hash256(extendedHash).slice(0, checksumLength);
}

multichain.extractVersion = function(extendedHash, versionLength, nbSpacerBytes) {
    var versionParts = [],
        hashParts = [], index = 0, fromIndex, toIndex;

    for (; index < versionLength; index++) {
        versionParts.push(extendedHash.slice(index * nbSpacerBytes + index, index * nbSpacerBytes + index + 1));

        fromIndex = index * nbSpacerBytes + index + 1;
        toIndex = (index + 1) * nbSpacerBytes + index + 1;

        hashParts.push(extendedHash.slice(fromIndex, toIndex));
    }

    if ((index * nbSpacerBytes + index) < extendedHash.length) {
        hashParts.push(extendedHash.slice(index * nbSpacerBytes + index));
    }

    return {
        'version': Buffer.concat(versionParts),
        'hash': Buffer.concat(hashParts)
    }
}

multichain.extendWithVersion = function(hash, versionHash, nbSpacerBytes) {
    var extendedParts = [], index = 0, fromIndex, toIndex;

    for (; index < versionHash.length; index++) {
        extendedParts.push(versionHash.slice(index, index + 1));

        fromIndex = index * nbSpacerBytes;
        toIndex = (index + 1) * nbSpacerBytes;

        extendedParts.push(hash.slice(fromIndex, toIndex));
    }

    if ((index * nbSpacerBytes) < hash.length) {
        extendedParts.push(hash.slice(index * nbSpacerBytes));
    }

    return Buffer.concat(extendedParts);
}

multichain.parseAddress = function(address, pubKeyHashVersions, checksumValue) {
    let data = false;

    for (let i in pubKeyHashVersions) {
        let pubKeyHashVersion = pubKeyHashVersions[i];

        try {
            data = multichain._parseAddress(address, pubKeyHashVersion, checksumValue);
        } catch (e) {}

        if (data.hash) {
            break;
        }
    }

    return data;
}
multichain._parseAddress = function(address, pubKeyHashVersion, checksumValue) {
    var logger = {log: console.log};

    let originalPubKeyHashVersion = pubKeyHashVersion;
    pubKeyHashVersion = typeof pubKeyHashVersion === 'number' ? multichain.bytesBufferFromNumber(pubKeyHashVersion) : pubKeyHashVersion;
    checksumValue = typeof checksumValue === 'number' ? multichain.bytesBufferFromNumber(checksumValue) : checksumValue;

    // --

    pubKeyHashVersion = Buffer.isBuffer(pubKeyHashVersion) ? pubKeyHashVersion : Buffer.from(pubKeyHashVersion, 'hex');
    checksumValue = Buffer.isBuffer(checksumValue) ? checksumValue : Buffer.from(checksumValue, 'hex');

    var decoded = new Buffer(base58.decode(address));
    logger.log('[parseAddress]', 'address', address);
    logger.log('[parseAddress]', 'decoded', decoded.toString('hex'));

    var extractedChecksum = decoded.slice(decoded.length - checksumValue.length),
        extendedAddress = decoded.slice(0, decoded.length - checksumValue.length),
        generatedChecksum = multichain.generateChecksum(extendedAddress, checksumValue.length),
        xorChecksum = xor(generatedChecksum, checksumValue);

    logger.log('[parseAddress]', 'extracted checksum', extractedChecksum.toString('hex'));
    logger.log('[parseAddress]', 'extended address', extendedAddress.toString('hex'));

    logger.log('[parseAddress]', 'generated checksum', generatedChecksum.toString('hex'));
    logger.log('[parseAddress]', 'xor checksum', xorChecksum.toString('hex'));

    if (compare(extractedChecksum, xorChecksum) !== 0) {
        throw new Error('Extracted checksum and generated checksum do not match (' + extractedChecksum.toString('hex') + ', ' + xorChecksum.toString('hex') + ')');
    }

    var extractedData = multichain.extractVersion(extendedAddress, pubKeyHashVersion.length, 5);

    if (compare(extractedData['version'], pubKeyHashVersion) !== 0) {
        throw new Error('Extracted address does not match the given address (' + extractedData['version'].toString('hex') + ', ' + pubKeyHashVersion.toString('hex') + ')');
    }

    var pubKeyHash = extractedData['hash'];

    logger.log('[parseAddress]', 'extracted public key hash', pubKeyHash.toString('hex'));

    return {
        hash: pubKeyHash,
        version: originalPubKeyHashVersion
    }
}

module.exports = multichain
