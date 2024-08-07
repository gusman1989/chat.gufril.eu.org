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
const chalk_1 = __importDefault(require("chalk"));
const log_1 = __importDefault(require("../log"));
// The order defines priority: the first available plugin is used.
// Always keep 'local' auth plugin at the end of the list; it should always be enabled.
const plugins = [Promise.resolve().then(() => __importStar(require("./auth/ldap"))), Promise.resolve().then(() => __importStar(require("./auth/local")))];
const toExport = {
    moduleName: "<module with no name>",
    // Must override: implements authentication mechanism
    auth: () => unimplemented("auth"),
    // Optional to override: implements filter for loading users at start up
    // This allows an auth plugin to check if a user is still acceptable, if the plugin
    // can do so without access to the user's unhashed password.
    // Returning 'false' triggers fallback to default behaviour of loading all users
    loadUsers: () => false,
    // local auth should always be enabled, but check here to verify
    initialized: false,
    // TODO: fix typing
    async initialize() {
        if (toExport.initialized) {
            return;
        }
        // Override default API stubs with exports from first enabled plugin found
        const resolvedPlugins = await Promise.all(plugins);
        for (const { default: plugin } of resolvedPlugins) {
            if (plugin.isEnabled()) {
                toExport.initialized = true;
                for (const name in plugin) {
                    toExport[name] = plugin[name];
                }
                break;
            }
        }
        if (!toExport.initialized) {
            log_1.default.error("None of the auth plugins is enabled");
        }
    },
};
function unimplemented(funcName) {
    log_1.default.debug(`Auth module ${chalk_1.default.bold(toExport.moduleName)} doesn't implement function ${chalk_1.default.bold(funcName)}`);
}
// Default API implementations
exports.default = toExport;
