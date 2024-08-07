"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const node_forge_1 = require("node-forge");
const log_1 = __importDefault(require("../log"));
const config_1 = __importDefault(require("../config"));
exports.default = {
    get,
    remove,
};
function get(uuid) {
    if (config_1.default.values.public) {
        return null;
    }
    const folderPath = config_1.default.getClientCertificatesPath();
    const paths = getPaths(folderPath, uuid);
    if (!fs_1.default.existsSync(paths.privateKeyPath) || !fs_1.default.existsSync(paths.certificatePath)) {
        return generateAndWrite(folderPath, paths);
    }
    try {
        return {
            private_key: fs_1.default.readFileSync(paths.privateKeyPath, "utf-8"),
            certificate: fs_1.default.readFileSync(paths.certificatePath, "utf-8"),
        };
    }
    catch (e) {
        log_1.default.error("Unable to get certificate", e);
    }
    return null;
}
function remove(uuid) {
    if (config_1.default.values.public) {
        return null;
    }
    const paths = getPaths(config_1.default.getClientCertificatesPath(), uuid);
    try {
        if (fs_1.default.existsSync(paths.privateKeyPath)) {
            fs_1.default.unlinkSync(paths.privateKeyPath);
        }
        if (fs_1.default.existsSync(paths.certificatePath)) {
            fs_1.default.unlinkSync(paths.certificatePath);
        }
    }
    catch (e) {
        log_1.default.error("Unable to remove certificate", e);
    }
}
function generateAndWrite(folderPath, paths) {
    const certificate = generate();
    try {
        fs_1.default.mkdirSync(folderPath, { recursive: true });
        fs_1.default.writeFileSync(paths.privateKeyPath, certificate.private_key, {
            mode: 0o600,
        });
        fs_1.default.writeFileSync(paths.certificatePath, certificate.certificate, {
            mode: 0o600,
        });
        return certificate;
    }
    catch (e) {
        log_1.default.error("Unable to write certificate", String(e));
    }
    return null;
}
function generate() {
    const keys = node_forge_1.pki.rsa.generateKeyPair(2048);
    const cert = node_forge_1.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = crypto_1.default.randomBytes(16).toString("hex").toUpperCase();
    // Set notBefore a day earlier just in case the time between
    // the client and server is not perfectly in sync
    cert.validity.notBefore = new Date();
    cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1);
    // Set notAfter 100 years into the future just in case
    // the server actually validates this field
    cert.validity.notAfter = new Date();
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 100);
    const attrs = [
        {
            name: "commonName",
            value: "The Lounge IRC Client",
        },
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    // Set extensions that indicate this is a client authentication certificate
    cert.setExtensions([
        {
            name: "extKeyUsage",
            clientAuth: true,
        },
        {
            name: "nsCertType",
            client: true,
        },
    ]);
    // Sign this certificate with a SHA256 signature
    cert.sign(keys.privateKey, node_forge_1.md.sha256.create());
    const pem = {
        private_key: node_forge_1.pki.privateKeyToPem(keys.privateKey),
        certificate: node_forge_1.pki.certificateToPem(cert),
    };
    return pem;
}
function getPaths(folderPath, uuid) {
    return {
        privateKeyPath: path_1.default.join(folderPath, `${uuid}.pem`),
        certificatePath: path_1.default.join(folderPath, `${uuid}.crt`),
    };
}
