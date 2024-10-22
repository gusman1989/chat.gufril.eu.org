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
const msg_1 = __importStar(require("../../models/msg"));
const config_1 = __importDefault(require("../../config"));
exports.default = (function (irc, network) {
    const client = this;
    irc.on("irc error", function (data) {
        const msg = new msg_1.default({
            type: msg_1.MessageType.ERROR,
            error: data.error,
            showInActive: true,
            nick: data.nick,
            channel: data.channel,
            reason: data.reason,
            command: data.command,
        });
        let target = network.getLobby();
        // If this error is channel specific and a channel
        // with this name exists, put this error in that channel
        if (data.channel) {
            const channel = network.getChannel(data.channel);
            if (typeof channel !== "undefined") {
                target = channel;
                msg.showInActive = false;
            }
        }
        target.pushMessage(client, msg, true);
    });
    irc.on("nick in use", function (data) {
        let message = data.nick + ": " + (data.reason || "Nickname is already in use.");
        if (irc.connection.registered === false && !config_1.default.values.public) {
            message += " An attempt to use it will be made when this nick quits.";
            // Clients usually get nick in use on connect when reconnecting to a network
            // after a network failure (like ping timeout), and as a result of that,
            // TL will append a random number to the nick.
            // keepNick will try to set the original nick name back if it sees a QUIT for that nick.
            network.keepNick = irc.user.nick;
        }
        const lobby = network.getLobby();
        const msg = new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: message,
            showInActive: true,
        });
        lobby.pushMessage(client, msg, true);
        if (irc.connection.registered === false) {
            const nickLen = parseInt(network.irc.network.options.NICKLEN, 10) || 16;
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            const random = (data.nick || irc.user.nick) + Math.floor(Math.random() * 10);
            // Safeguard nick changes up to allowed length
            // Some servers may send "nick in use" error even for randomly generated nicks
            if (random.length <= nickLen) {
                irc.changeNick(random);
            }
        }
        client.emit("nick", {
            network: network.uuid,
            nick: irc.user.nick,
        });
    });
    irc.on("nick invalid", function (data) {
        const lobby = network.getLobby();
        const msg = new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: data.nick + ": " + (data.reason || "Nickname is invalid."),
            showInActive: true,
        });
        lobby.pushMessage(client, msg, true);
        if (irc.connection.registered === false) {
            irc.changeNick(config_1.default.getDefaultNick());
        }
        client.emit("nick", {
            network: network.uuid,
            nick: irc.user.nick,
        });
    });
});
