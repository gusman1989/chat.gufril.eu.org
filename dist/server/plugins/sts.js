"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const log_1 = __importDefault(require("../log"));
const config_1 = __importDefault(require("../config"));
class STSPolicies {
    stsFile;
    refresh;
    policies;
    constructor() {
        this.stsFile = path_1.default.join(config_1.default.getHomePath(), "sts-policies.json");
        this.policies = new Map();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.refresh = lodash_1.default.debounce(this.saveFile, 10000, { maxWait: 60000 });
        if (!fs_1.default.existsSync(this.stsFile)) {
            return;
        }
        const storedPolicies = JSON.parse(fs_1.default.readFileSync(this.stsFile, "utf-8"));
        const now = Date.now();
        storedPolicies.forEach((value) => {
            if (value.expires > now) {
                this.policies.set(value.host, {
                    port: value.port,
                    duration: value.duration,
                    expires: value.expires,
                });
            }
        });
    }
    get(host) {
        const policy = this.policies.get(host);
        if (typeof policy === "undefined") {
            return null;
        }
        if (policy.expires <= Date.now()) {
            this.policies.delete(host);
            this.refresh();
            return null;
        }
        return policy;
    }
    update(host, port, duration) {
        if (duration > 0) {
            this.policies.set(host, {
                port: port,
                duration: duration,
                expires: Date.now() + duration * 1000,
            });
        }
        else {
            this.policies.delete(host);
        }
        this.refresh();
    }
    refreshExpiration(host) {
        const policy = this.policies.get(host);
        if (typeof policy === "undefined") {
            return null;
        }
        policy.expires = Date.now() + policy.duration * 1000;
    }
    saveFile() {
        const policiesToStore = [];
        this.policies.forEach((value, key) => {
            policiesToStore.push({
                host: key,
                port: value.port,
                duration: value.duration,
                expires: value.expires,
            });
        });
        const file = JSON.stringify(policiesToStore, null, "\t");
        fs_1.default.writeFile(this.stsFile, file, { flag: "w+" }, (err) => {
            if (err) {
                log_1.default.error("Failed to update STS policies file!", err.message);
            }
        });
    }
}
exports.default = new STSPolicies();
