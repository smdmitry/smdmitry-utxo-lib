var bufferutils = require('./bufferutils');

var encodeString = bufferutils.encodeString;

let Constants = {
    ATTACHMENT: {
        TYPE: {
            ETP_TRANSFER: 0,
            MST: 2,
            MESSAGE: 3,
            AVATAR: 4,
            CERT: 5,
            MIT: 6,
            COINSTAKE: 4294967295
        },
        VERSION: {
            DEFAULT: 1,
            DID: 207
        }
    },

    MST: {
        STATUS: {
            REGISTER: 1,
            TRANSFER: 2
        }
    },

    MIT: {
        STATUS: {
            REGISTER: 1,
            TRANSFER: 2
        }
    },

    CERT: {
        TYPE: {
            ISSUE: 1,
            DOMAIN: 2,
            NAMING: 3,
            MINING: 0x60000000 + 4,
        },
        STATUS: {
            DEFAULT: 0,
            ISSUE: 1,
            TRANSFER: 2,
            AUTOISSUE: 3
        }
    },

    AVATAR: {
        STATUS: {
            REGISTER: 1,
            TRANSFER: 2
        }
    },

    FEE: {
        DEFAULT: 10000,
        MST_REGISTER: 1000000000,
        AVATAR_REGISTER: 100000000,
        SWAP_FEE: 100000000
    },

    CELEBRITIES: {
        BOUNTY: {
            mainnet: {
                address: "MAwLwVGwJyFsTBfNj2j5nCUrQXGVRvHzPh",
                symbol: "developer-community"
            },
            testnet: {
                address: "tBELxsiiaMVGQcY2Apf7hmzAaipD4YWTTj",
                symbol: "yoyo"
            }
        }
    },

    UTXO: {
        MAX_COUNT: 600,
    }
};

function encodeAttachmentMSTTransfer(buffer, offset, symbol, quantity) {
    if (symbol == undefined)
        throw Error('Specify output asset');
    if (quantity == undefined)
        throw Error('Specify output quanity');
    offset = buffer.writeUInt32LE(Constants.MST.STATUS.TRANSFER, offset);
    offset += encodeString(buffer, symbol, offset);
    offset = bufferutils.writeUInt64LE(buffer, quantity, offset);
    return offset;
};
function encodeAttachmentDid(buffer, offset, attachment_data) {
    offset = buffer.writeUInt32LE(attachment_data.status, offset);
    offset += encodeString(buffer, attachment_data.symbol, offset);
    offset += encodeString(buffer, attachment_data.address, offset);
    return offset;
};
function encodeAttachmentAssetIssue(buffer, offset, attachment_data) {
    offset = buffer.writeUInt32LE(attachment_data.status, offset);
    //Encode symbol
    offset += encodeString(buffer, attachment_data.symbol, offset);
    //Encode maximum supply
    offset = bufferutils.writeUInt64LE(buffer, attachment_data.max_supply, offset);
    //Encode precision
    offset = buffer.writeUInt8(attachment_data.precision, offset);
    //Encode secondary issue threshold
    offset = buffer.writeUInt8((attachment_data.secondaryissue_threshold) ? attachment_data.secondaryissue_threshold : 0, offset);
    offset += buffer.write("0000", offset, 2, 'hex');
    //Encode issuer
    offset += encodeString(buffer, attachment_data.issuer, offset);
    //Encode recipient address
    offset += encodeString(buffer, attachment_data.address, offset);
    //Encode description
    offset += encodeString(buffer, attachment_data.description, offset);
    return offset;
};
function encodeAttachmentMessage(buffer, offset, message) {
    if (message == undefined)
        throw Error('Specify message');
    offset += encodeString(buffer, message, offset);
    return offset;
};
function encodeAttachmentCert(buffer, offset, attachment_data) {
    offset += encodeString(buffer, attachment_data.symbol, offset);
    offset += encodeString(buffer, attachment_data.owner, offset);
    offset += encodeString(buffer, attachment_data.address, offset);
    offset = buffer.writeUInt32LE(attachment_data.cert, offset);
    offset = buffer.writeUInt8(attachment_data.status, offset);
    if (attachment_data.content) {
        offset += encodeString(buffer, attachment_data.content, offset);
    }
    return offset;
};
function encodeAttachmentMITRegister(buffer, offset, symbol, content, address) {
    offset = buffer.writeUInt8(Constants.MIT.STATUS.REGISTER, offset);
    offset += encodeString(buffer, symbol, offset);
    offset += encodeString(buffer, address, offset);
    offset += encodeString(buffer, content, offset);
    return offset;
};
function encodeAttachmentMITTransfer(buffer, offset, symbol, address) {
    offset = buffer.writeUInt8(Constants.MIT.STATUS.TRANSFER, offset);
    offset += encodeString(buffer, symbol, offset);
    offset += encodeString(buffer, address, offset);
    return offset;
};

function getAttachmentBuffer(attachment) {
    let offset = 0;
    let output = {attachment: attachment};

    if (attachment) {
        let buffer = Buffer.allocUnsafe(1000000);

        offset = buffer.writeUInt32LE(output.attachment.version, offset);
        offset = buffer.writeUInt32LE(output.attachment.type, offset);

        if (output.attachment.version === Constants.ATTACHMENT.VERSION.DID) {
            offset += encodeString(buffer, output.attachment.to_did, offset);
            offset += encodeString(buffer, output.attachment.from_did, offset);
        }

        switch (output.attachment.type) {
            case Constants.ATTACHMENT.TYPE.ETP_TRANSFER:
                break;
            case Constants.ATTACHMENT.TYPE.MST:
                switch (output.attachment.status) {
                    case Constants.MST.STATUS.REGISTER:
                        offset = encodeAttachmentAssetIssue(buffer, offset, output.attachment);
                        break;
                    case Constants.MST.STATUS.TRANSFER:
                        offset = encodeAttachmentMSTTransfer(buffer, offset, output.attachment.symbol, output.attachment.quantity);
                        break;
                    default:
                        throw Error("Asset status unknown");
                }
                break;
            case Constants.ATTACHMENT.TYPE.MESSAGE:
                offset = encodeAttachmentMessage(buffer, offset, output.attachment.message);
                break;
            case Constants.ATTACHMENT.TYPE.AVATAR:
                offset = encodeAttachmentDid(buffer, offset, output.attachment);
                break;
            case Constants.ATTACHMENT.TYPE.CERT:
                offset = encodeAttachmentCert(buffer, offset, output.attachment);
                break;
            case Constants.ATTACHMENT.TYPE.MIT:
                switch (output.attachment.status) {
                    case Constants.MIT.STATUS.REGISTER:
                        offset = encodeAttachmentMITRegister(buffer, offset, output.attachment.symbol, output.attachment.content, output.attachment.address);
                        break;
                    case Constants.MIT.STATUS.TRANSFER:
                        offset = encodeAttachmentMITTransfer(buffer, offset, output.attachment.symbol, output.attachment.address);
                        break;
                    default:
                        throw Error("Asset status unknown");
                }
                break;
            default:
                throw Error("What kind of an output is that?!");
        }

        return buffer.slice(0, offset);
    }

    return Buffer.alloc(0);
}

function readAttachmentBuffer(buffer, offset = 0) {
    function readSlice(n) {
        offset += n;
        return buffer.slice(offset - n, offset);
    }

    function readUInt8() {
        offset += 1;
        return buffer.readUInt8(offset - 1);
    }

    function readUInt32() {
        offset += 4;
        return buffer.readUInt32LE(offset - 4);
    }

    function readUInt64() {
        offset += 8;
        return bufferutils.readUInt64LE(buffer, offset - 8);
    }

    function readString() {
        var length = bufferutils.readVarInt(buffer, offset);
        offset += length.size;
        return readSlice(length.number).toString();
    }

    function readAttachment() {
        let attachment = {};
        attachment.version = readUInt32();
        attachment.type = readUInt32();

        if (attachment.version === Constants.ATTACHMENT.VERSION.DID) {
            attachment.to_did = readString();
            attachment.from_did = readString();
        }

        switch (attachment.type) {
            case Constants.ATTACHMENT.TYPE.ETP_TRANSFER:
                break;
            case Constants.ATTACHMENT.TYPE.MST:
                attachment.status = readUInt32();
                switch (attachment.status) {
                    case Constants.MST.STATUS.REGISTER:
                        attachment.symbol = readString();
                        attachment.max_supply = readUInt64();
                        attachment.precision = readUInt8();
                        attachment.secondaryissue_threshold = readUInt8();
                        if (attachment.secondaryissue_threshold == 127)
                            attachment.secondaryissue_threshold = -1;
                        if (attachment.secondaryissue_threshold > 127) {
                            attachment.secondaryissue_threshold -= 128;
                            attachment.is_secondaryissue = 1;
                        } else {
                            attachment.is_secondaryissue = 0;
                        }
                        offset += 2;
                        attachment.issuer = readString();
                        attachment.address = readString();
                        attachment.description = readString();
                        break;
                    case Constants.MST.STATUS.TRANSFER:
                        attachment.symbol = readString();
                        attachment.quantity = readUInt64();
                        break;
                    default:
                        throw 'Unknown attachment status: ' + attachment.status;
                }
                break;
            case Constants.ATTACHMENT.TYPE.MESSAGE:
                attachment.message = readString();
                break;
            case Constants.ATTACHMENT.TYPE.AVATAR:
                attachment.status = readUInt32();
                attachment.symbol = readString();
                attachment.address = readString();
                break;
            case Constants.ATTACHMENT.TYPE.MIT:
                attachment.status = readUInt8();
                attachment.symbol = readString();
                attachment.address = readString();
                if (attachment.status == Constants.MIT.STATUS.REGISTER) {
                    attachment.content = readString();
                }
                break;
            case Constants.ATTACHMENT.TYPE.CERT:
                attachment.symbol = readString();
                attachment.owner = readString();
                attachment.address = readString();
                attachment.cert = readUInt32();
                attachment.status = readUInt8();
                if (certHasContent(attachment.cert)) {
                    attachment.content = readString();
                }
                break;
            case Constants.ATTACHMENT.TYPE.COINSTAKE:
                break;
            default:
                throw 'Unknown attachment type: ' + attachment.type;
        }
        return {
            offset: offset,
            attachment: attachment,
        };
    }

    function certHasContent(certType) {
        switch (certType) {
            case Constants.CERT.TYPE.MINING:
                return true
        }
        return false
    }

    return readAttachment();
};

module.exports = {
    getAttachmentBuffer,
    readAttachmentBuffer,
}
