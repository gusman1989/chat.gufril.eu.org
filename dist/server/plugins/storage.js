"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("../log"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config"));
class Storage {
    references;
    constructor() {
        this.references = new Map();
    }
    emptyDir() {
        // Ensures that a directory is empty.
        // Deletes directory contents if the directory is not empty.
        // If the directory does not exist, it is created.
        const dir = config_1.default.getStoragePath();
        let items;
        try {
            items = fs_1.default.readdirSync(dir);
        }
        catch (e) {
            fs_1.default.mkdirSync(dir, { recursive: true });
            return;
        }
        // TODO: Use `fs.rmdirSync(dir, {recursive: true});` when it's stable (node 13+)
        items.forEach((item) => deleteFolder(path_1.default.join(dir, item)));
    }
    dereference(url) {
        const references = (this.references.get(url) || 0) - 1;
        if (references < 0) {
            return log_1.default.warn("Tried to dereference a file that has no references", url);
        }
        if (references > 0) {
            return this.references.set(url, references);
        }
        this.references.delete(url);
        // Drop "storage/" from url and join it with full storage path
        const filePath = path_1.default.join(config_1.default.getStoragePath(), url.substring(8));
        fs_1.default.unlink(filePath, (err) => {
            if (err) {
                log_1.default.error("Failed to delete stored file", err.message);
            }
        });
    }
    store(data, extension, callback) {
        const hash = crypto_1.default.createHash("sha256").update(data).digest("hex");
        const a = hash.substring(0, 2);
        const b = hash.substring(2, 4);
        const folder = path_1.default.join(config_1.default.getStoragePath(), a, b);
        const filePath = path_1.default.join(folder, `${hash.substring(4)}.${extension}`);
        const url = `storage/${a}/${b}/${hash.substring(4)}.${extension}`;
        this.references.set(url, 1 + (this.references.get(url) || 0));
        // If file with this name already exists, we don't need to write it again
        if (fs_1.default.existsSync(filePath)) {
            return callback(url);
        }
        fs_1.default.mkdir(folder, { recursive: true }, (mkdirErr) => {
            if (mkdirErr) {
                log_1.default.error("Failed to create storage folder", mkdirErr.message);
                return callback("");
            }
            fs_1.default.writeFile(filePath, data, (err) => {
                if (err) {
                    log_1.default.error("Failed to store a file", err.message);
                    return callback("");
                }
                callback(url);
            });
        });
    }
}
exports.default = new Storage();
function deleteFolder(dir) {
    fs_1.default.readdirSync(dir).forEach((item) => {
        item = path_1.default.join(dir, item);
        if (fs_1.default.lstatSync(item).isDirectory()) {
            deleteFolder(item);
        }
        else {
            fs_1.default.unlinkSync(item);
        }
    });
    fs_1.default.rmdirSync(dir);
}
