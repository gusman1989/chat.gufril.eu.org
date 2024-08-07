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
/* eslint-disable @typescript-eslint/restrict-plus-operands */
const lodash_1 = __importDefault(require("lodash"));
const log_1 = __importDefault(require("../../log"));
const msg_1 = __importStar(require("../../models/msg"));
const helper_1 = __importDefault(require("../../helper"));
const config_1 = __importDefault(require("../../config"));
const chan_1 = require("../../models/chan");
exports.default = (function (irc, network) {
    const client = this;
    network.getLobby().pushMessage(client, new msg_1.default({
        text: "Network created, connecting to " + network.host + ":" + network.port + "...",
    }), true);
    irc.on("registered", function () {
        if (network.irc.network.cap.enabled.length > 0) {
            network.getLobby().pushMessage(client, new msg_1.default({
                text: "Enabled capabilities: " + network.irc.network.cap.enabled.join(", "),
            }), true);
        }
        // Always restore away message for this network
        if (network.awayMessage) {
            irc.raw("AWAY", network.awayMessage);
            // Only set generic away message if there are no clients attached
        }
        else if (client.awayMessage && lodash_1.default.size(client.attachedClients) === 0) {
            irc.raw("AWAY", client.awayMessage);
        }
        let delay = 1000;
        if (Array.isArray(network.commands)) {
            network.commands.forEach((cmd) => {
                setTimeout(function () {
                    client.input({
                        target: network.getLobby().id,
                        text: cmd,
                    });
                }, delay);
                delay += 1000;
            });
        }
        network.channels.forEach((chan) => {
            if (chan.type !== chan_1.ChanType.CHANNEL) {
                return;
            }
            setTimeout(function () {
                network.irc.join(chan.name, chan.key);
            }, delay);
            delay += 1000;
        });
    });
    irc.on("socket connected", function () {
        if (irc.network.options.PREFIX) {
            network.serverOptions.PREFIX.update(irc.network.options.PREFIX);
        }
        network.getLobby().pushMessage(client, new msg_1.default({
            text: "Connected to the network.",
        }), true);
        sendStatus();
    });
    irc.on("close", function () {
        network.getLobby().pushMessage(client, new msg_1.default({
            text: "Disconnected from the network, and will not reconnect. Use /connect to reconnect again.",
        }), true);
    });
    let identSocketId;
    irc.on("raw socket connected", function (socket) {
        let ident = client.name || network.username;
        if (config_1.default.values.useHexIp) {
            ident = helper_1.default.ip2hex(client.config.browser.ip);
        }
        identSocketId = client.manager.identHandler.addSocket(socket, ident);
    });
    irc.on("socket close", function (error) {
        if (identSocketId > 0) {
            client.manager.identHandler.removeSocket(identSocketId);
            identSocketId = 0;
        }
        network.channels.forEach((chan) => {
            chan.users = new Map();
            chan.state = chan_1.ChanState.PARTED;
        });
        if (error) {
            network.getLobby().pushMessage(client, new msg_1.default({
                type: msg_1.MessageType.ERROR,
                text: `Connection closed unexpectedly: ${String(error)}`,
            }), true);
        }
        if (network.keepNick) {
            // We disconnected without getting our original nick back yet, just set it back locally
            irc.options.nick = irc.user.nick = network.keepNick;
            network.setNick(network.keepNick);
            network.keepNick = null;
            client.emit("nick", {
                network: network.uuid,
                nick: network.nick,
            });
        }
        sendStatus();
    });
    if (config_1.default.values.debug.ircFramework) {
        irc.on("debug", function (message) {
            log_1.default.debug(`[${client.name} (${client.id}) on ${network.name} (${network.uuid}]`, message);
        });
    }
    if (config_1.default.values.debug.raw) {
        irc.on("raw", function (message) {
            network.getLobby().pushMessage(client, new msg_1.default({
                self: !message.from_server,
                type: msg_1.MessageType.RAW,
                text: message.line,
            }), true);
        });
    }
    irc.on("socket error", function (err) {
        network.getLobby().pushMessage(client, new msg_1.default({
            type: msg_1.MessageType.ERROR,
            text: "Socket error: " + err,
        }), true);
    });
    irc.on("reconnecting", function (data) {
        network.getLobby().pushMessage(client, new msg_1.default({
            text: `Disconnected from the network. Reconnecting in ${Math.round(data.wait / 1000)} seconds… (Attempt ${Number(data.attempt)})`,
        }), true);
    });
    irc.on("ping timeout", function () {
        network.getLobby().pushMessage(client, new msg_1.default({
            text: "Ping timeout, disconnecting…",
        }), true);
    });
    irc.on("server options", function (data) {
        network.serverOptions.PREFIX.update(data.options.PREFIX);
        if (data.options.CHANTYPES) {
            network.serverOptions.CHANTYPES = data.options.CHANTYPES;
        }
        network.serverOptions.NETWORK = data.options.NETWORK;
        client.emit("network:options", {
            network: network.uuid,
            serverOptions: network.serverOptions,
        });
    });
    function sendStatus() {
        const status = network.getNetworkStatus();
        const toSend = {
            ...status,
            network: network.uuid,
        };
        client.emit("network:status", toSend);
    }
});
