"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const log_1 = __importDefault(require("../log"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const web_push_1 = __importDefault(require("web-push"));
const config_1 = __importDefault(require("../config"));
const os = __importStar(require("os"));
class WebPush {
    vapidKeys;
    constructor() {
        const vapidPath = path_1.default.join(config_1.default.getHomePath(), "vapid.json");
        let vapidStat = undefined;
        try {
            vapidStat = fs_1.default.statSync(vapidPath);
        }
        catch {
            // ignored on purpose, node v14.17.0 will give us {throwIfNoEntry: false}
        }
        if (vapidStat) {
            const isWorldReadable = (vapidStat.mode & 0o004) !== 0;
            if (isWorldReadable) {
                log_1.default.warn(vapidPath, "is world readable.", "The file contains secrets. Please fix the permissions.");
                if (os.platform() !== "win32") {
                    log_1.default.warn(`run \`chmod o= "${vapidPath}"\` to correct it.`);
                }
            }
            const data = fs_1.default.readFileSync(vapidPath, "utf-8");
            const parsedData = JSON.parse(data);
            if (typeof parsedData.publicKey === "string" &&
                typeof parsedData.privateKey === "string") {
                this.vapidKeys = {
                    publicKey: parsedData.publicKey,
                    privateKey: parsedData.privateKey,
                };
            }
        }
        if (!this.vapidKeys) {
            this.vapidKeys = web_push_1.default.generateVAPIDKeys();
            fs_1.default.writeFileSync(vapidPath, JSON.stringify(this.vapidKeys, null, "\t"), {
                mode: 0o600,
            });
            log_1.default.info("New VAPID key pair has been generated for use with push subscription.");
        }
        web_push_1.default.setVapidDetails("https://github.com/thelounge/thelounge", this.vapidKeys.publicKey, this.vapidKeys.privateKey);
    }
    push(client, payload, onlyToOffline) {
        lodash_1.default.forOwn(client.config.sessions, ({ pushSubscription }, token) => {
            if (pushSubscription) {
                if (onlyToOffline && lodash_1.default.find(client.attachedClients, { token }) !== undefined) {
                    return;
                }
                this.pushSingle(client, pushSubscription, payload);
            }
        });
    }
    pushSingle(client, subscription, payload) {
        web_push_1.default.sendNotification(subscription, JSON.stringify(payload)).catch((error) => {
            if (error.statusCode >= 400 && error.statusCode < 500) {
                log_1.default.warn(`WebPush subscription for ${client.name} returned an error (${String(error.statusCode)}), removing subscription`);
                lodash_1.default.forOwn(client.config.sessions, ({ pushSubscription }, token) => {
                    if (pushSubscription && pushSubscription.endpoint === subscription.endpoint) {
                        client.unregisterPushSubscription(token);
                    }
                });
                return;
            }
            log_1.default.error(`WebPush Error (${String(error)})`);
        });
    }
}
exports.default = WebPush;
