"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageCleaner = void 0;
const msg_1 = require("./models/msg");
const config_1 = __importDefault(require("./config"));
const log_1 = __importDefault(require("./log"));
const status_types = [
    msg_1.MessageType.AWAY,
    msg_1.MessageType.BACK,
    msg_1.MessageType.INVITE,
    msg_1.MessageType.JOIN,
    msg_1.MessageType.KICK,
    msg_1.MessageType.MODE,
    msg_1.MessageType.MODE_CHANNEL,
    msg_1.MessageType.MODE_USER,
    msg_1.MessageType.NICK,
    msg_1.MessageType.PART,
    msg_1.MessageType.QUIT,
    msg_1.MessageType.CTCP,
    msg_1.MessageType.CTCP_REQUEST,
    msg_1.MessageType.CHGHOST,
    msg_1.MessageType.TOPIC,
    msg_1.MessageType.TOPIC_SET_BY,
];
class StorageCleaner {
    db;
    olderThanDays;
    messageTypes;
    limit;
    ticker;
    errCount;
    isStopped;
    constructor(db) {
        this.errCount = 0;
        this.isStopped = true;
        this.db = db;
        this.limit = 200;
        const policy = config_1.default.values.storagePolicy;
        this.olderThanDays = policy.maxAgeDays;
        switch (policy.deletionPolicy) {
            case "statusOnly":
                this.messageTypes = status_types;
                break;
            case "everything":
                this.messageTypes = null;
                break;
            default:
                // exhaustive switch guard, blows up when user specifies a invalid policy enum
                this.messageTypes = assertNoBadPolicy(policy.deletionPolicy);
        }
    }
    genDeletionRequest() {
        return {
            limit: this.limit,
            messageTypes: this.messageTypes,
            olderThanDays: this.olderThanDays,
        };
    }
    async runDeletesNoLimit() {
        if (!config_1.default.values.storagePolicy.enabled) {
            // this is meant to be used by cli tools, so we guard against this
            throw new Error("storage policy is disabled");
        }
        const req = this.genDeletionRequest();
        req.limit = -1; // unlimited
        const num_deleted = await this.db.deleteMessages(req);
        return num_deleted;
    }
    async runDeletes() {
        if (this.isStopped) {
            return;
        }
        if (!this.db.isEnabled) {
            // TODO: remove this once the server is intelligent enough to wait for init
            this.schedule(30 * 1000);
            return;
        }
        const req = this.genDeletionRequest();
        let num_deleted = 0;
        try {
            num_deleted = await this.db.deleteMessages(req);
            this.errCount = 0; // reset when it works
        }
        catch (err) {
            this.errCount++;
            log_1.default.error("can't clean messages", err.message);
            if (this.errCount === 2) {
                log_1.default.error("Cleaning failed too many times, will not retry");
                this.stop();
                return;
            }
        }
        // need to recheck here as the field may have changed since the await
        if (this.isStopped) {
            return;
        }
        if (num_deleted < req.limit) {
            this.schedule(5 * 60 * 1000);
        }
        else {
            this.schedule(5000); // give others a chance to execute queries
        }
    }
    schedule(ms) {
        const self = this;
        this.ticker = setTimeout(() => {
            self.runDeletes().catch((err) => {
                log_1.default.error("storageCleaner: unexpected failure");
                throw err;
            });
        }, ms);
    }
    start() {
        this.isStopped = false;
        this.schedule(0);
    }
    stop() {
        this.isStopped = true;
        if (!this.ticker) {
            return;
        }
        clearTimeout(this.ticker);
    }
}
exports.StorageCleaner = StorageCleaner;
function assertNoBadPolicy(_) {
    throw new Error(`Invalid deletion policy "${config_1.default.values.storagePolicy.deletionPolicy}" in the \`storagePolicy\` object, fix your config.`);
}
