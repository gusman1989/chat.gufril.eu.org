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
Object.defineProperty(exports, "__esModule", { value: true });
const msg_1 = __importStar(require("../../models/msg"));
const commands = ["connect", "server"];
const allowDisconnected = true;
const input = function (network, chan, cmd, args) {
    if (args.length === 0) {
        network.userDisconnected = false;
        this.save();
        const irc = network.irc;
        if (!irc) {
            return;
        }
        if (irc.connected) {
            chan.pushMessage(this, new msg_1.default({
                type: msg_1.MessageType.ERROR,
                text: "You are already connected.",
            }));
            return;
        }
        irc.connect();
        return;
    }
    let port = args[1] || "";
    const tls = port[0] === "+";
    if (tls) {
        port = port.substring(1);
    }
    const host = args[0];
    this.connectToNetwork({ host, port, tls });
    return true;
};
exports.default = {
    commands,
    input,
    allowDisconnected,
};
