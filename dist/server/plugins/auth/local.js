"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const log_1 = __importDefault(require("../../log"));
const helper_1 = __importDefault(require("../../helper"));
const localAuth = (manager, client, user, password, callback) => {
    // If no user is found, or if the client has not provided a password,
    // fail the authentication straight away
    if (!client || !password) {
        return callback(false);
    }
    // If this user has no password set, fail the authentication
    if (!client.config.password) {
        log_1.default.error(`User ${chalk_1.default.bold(user)} with no local password set tried to sign in. (Probably a LDAP user)`);
        return callback(false);
    }
    helper_1.default.password
        .compare(password, client.config.password)
        .then((matching) => {
        if (matching && helper_1.default.password.requiresUpdate(client.config.password)) {
            const hash = helper_1.default.password.hash(password);
            client.setPassword(hash, (success) => {
                if (success) {
                    log_1.default.info(`User ${chalk_1.default.bold(client.name)} logged in and their hashed password has been updated to match new security requirements`);
                }
            });
        }
        callback(matching);
    })
        .catch((error) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        log_1.default.error(`Error while checking users password. Error: ${error}`);
    });
};
exports.default = {
    moduleName: "local",
    auth: localAuth,
    isEnabled: () => true,
};
