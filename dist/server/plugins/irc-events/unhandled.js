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
exports.default = (function (irc, network) {
    const client = this;
    irc.on("unknown command", function (command) {
        let target = network.getLobby();
        // Do not display users own name
        if (command.params.length > 0 && command.params[0] === network.irc.user.nick) {
            command.params.shift();
        }
        // Check the length again because we may shift the nick above
        if (command.params.length > 0) {
            // If this numeric starts with a channel name that exists
            // put this message in that channel
            const channel = network.getChannel(command.params[0]);
            if (typeof channel !== "undefined") {
                target = channel;
            }
        }
        target.pushMessage(client, new msg_1.default({
            type: msg_1.MessageType.UNHANDLED,
            command: command.command,
            params: command.params,
        }), true);
    });
});
