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
const helper_1 = __importDefault(require("../../helper"));
const msg_1 = __importStar(require("../../models/msg"));
const user_1 = __importDefault(require("../../models/user"));
const package_json_1 = __importDefault(require("../../../package.json"));
const ctcpResponses = {
    CLIENTINFO: () => Object.getOwnPropertyNames(ctcpResponses)
        .filter((key) => key !== "CLIENTINFO" && typeof ctcpResponses[key] === "function")
        .join(" "),
    PING: ({ message }) => message.substring(5),
    SOURCE: () => package_json_1.default.repository.url,
    VERSION: () => package_json_1.default.name + " -- " + package_json_1.default.homepage,
};
exports.default = (function (irc, network) {
    const client = this;
    const lobby = network.getLobby();
    irc.on("ctcp response", function (data) {
        const shouldIgnore = network.ignoreList.some(function (entry) {
            return helper_1.default.compareHostmask(entry, data);
        });
        if (shouldIgnore) {
            return;
        }
        let chan = network.getChannel(data.nick);
        if (typeof chan === "undefined") {
            chan = lobby;
        }
        const msg = new msg_1.default({
            type: msg_1.MessageType.CTCP,
            time: data.time,
            from: chan.getUser(data.nick),
            ctcpMessage: data.message,
        });
        chan.pushMessage(client, msg, true);
    });
    // Limit requests to a rate of one per second max
    irc.on("ctcp request", lodash_1.default.throttle((data) => {
        // Ignore echoed ctcp requests that aren't targeted at us
        // See https://github.com/kiwiirc/irc-framework/issues/225
        if (data.nick === irc.user.nick &&
            data.nick !== data.target &&
            network.irc.network.cap.isEnabled("echo-message")) {
            return;
        }
        const shouldIgnore = network.ignoreList.some(function (entry) {
            return helper_1.default.compareHostmask(entry, data);
        });
        if (shouldIgnore) {
            return;
        }
        const target = data.from_server ? data.hostname : data.nick;
        const response = ctcpResponses[data.type];
        if (response) {
            irc.ctcpResponse(target, data.type, response(data));
        }
        // Let user know someone is making a CTCP request against their nick
        const msg = new msg_1.default({
            type: msg_1.MessageType.CTCP_REQUEST,
            time: data.time,
            from: new user_1.default({ nick: target }),
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            hostmask: data.ident + "@" + data.hostname,
            ctcpMessage: data.message,
        });
        lobby.pushMessage(client, msg, true);
    }, 1000, { trailing: false }));
});
