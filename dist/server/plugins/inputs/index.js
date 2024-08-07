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
const log_1 = __importDefault(require("../../log"));
const clientSideCommands = ["/collapse", "/expand", "/search"];
const passThroughCommands = [
    "/as",
    "/bs",
    "/cs",
    "/ho",
    "/hs",
    "/join",
    "/ms",
    "/ns",
    "/os",
    "/rs",
];
const userInputs = new Map();
const builtInInputs = [
    "action",
    "away",
    "ban",
    "connect",
    "ctcp",
    "disconnect",
    "ignore",
    "invite",
    "kick",
    "kill",
    "list",
    "mode",
    "msg",
    "nick",
    "notice",
    "part",
    "quit",
    "raw",
    "rejoin",
    "topic",
    "whois",
    "mute",
];
for (const input of builtInInputs) {
    Promise.resolve().then(() => __importStar(require(`./${input}`))).then((plugin) => {
        plugin.default.commands.forEach((command) => userInputs.set(command, plugin.default));
    })
        .catch((err) => {
        log_1.default.error(err);
    });
}
const pluginCommands = new Map();
const getCommands = () => Array.from(userInputs.keys())
    .concat(Array.from(pluginCommands.keys()))
    .map((command) => `/${command}`)
    .concat(clientSideCommands)
    .concat(passThroughCommands)
    .sort();
const addPluginCommand = (packageInfo, command, obj) => {
    if (typeof command !== "string") {
        log_1.default.error(`plugin {packageInfo.packageName} tried to register a bad command`);
        return;
    }
    else if (!obj || typeof obj.input !== "function") {
        log_1.default.error(`plugin ${packageInfo.packageName} tried to register command "${command} without a callback"`);
        return;
    }
    pluginCommands.set(command, {
        packageInfo: packageInfo,
        input: obj.input,
        allowDisconnected: obj.allowDisconnected,
    });
};
exports.default = {
    addPluginCommand,
    getCommands,
    pluginCommands,
    userInputs,
};
