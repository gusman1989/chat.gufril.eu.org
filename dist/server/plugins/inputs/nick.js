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
const commands = ["nick"];
const allowDisconnected = true;
const input = function (network, chan, cmd, args) {
    if (args.length === 0) {
        chan.pushMessage(this, new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: "Usage: /nick <your new nick>",
        }));
        return;
    }
    if (args.length !== 1) {
        chan.pushMessage(this, new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: "Nicknames may not contain spaces.",
        }));
        return;
    }
    const newNick = args[0];
    if (newNick.length > 100) {
        chan.pushMessage(this, new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: "Nicknames may not be this long.",
        }));
        return;
    }
    // If we were trying to keep a nick and user changes nick, stop trying to keep the old one
    network.keepNick = null;
    // If connected to IRC, send to server and wait for ACK
    // otherwise update the nick and UI straight away
    if (network.irc) {
        if (network.irc.connected) {
            network.irc.changeNick(newNick);
            return;
        }
        network.irc.options.nick = network.irc.user.nick = newNick;
    }
    network.setNick(newNick);
    this.emit("nick", {
        network: network.uuid,
        nick: newNick,
    });
    this.save();
};
exports.default = {
    commands,
    input,
    allowDisconnected,
};
