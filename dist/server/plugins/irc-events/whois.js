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
const chan_1 = require("../../models/chan");
const msg_1 = __importStar(require("../../models/msg"));
exports.default = (function (irc, network) {
    const client = this;
    irc.on("whois", handleWhois);
    irc.on("whowas", (data) => {
        data.whowas = true;
        handleWhois(data);
    });
    function handleWhois(data) {
        let chan = network.getChannel(data.nick);
        if (typeof chan === "undefined") {
            // Do not create new windows for errors as they may contain illegal characters
            if (data.error) {
                chan = network.getLobby();
            }
            else {
                chan = client.createChannel({
                    type: chan_1.ChanType.QUERY,
                    name: data.nick,
                });
                client.emit("join", {
                    shouldOpen: true,
                    network: network.uuid,
                    chan: chan.getFilteredClone(true),
                    index: network.addChannel(chan),
                });
                chan.loadMessages(client, network);
                client.save();
            }
        }
        let msg;
        if (data.error) {
            msg = new msg_1.default({
                type: msg_1.MessageType.ERROR,
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                text: "No such nick: " + data.nick,
            });
        }
        else {
            // Absolute datetime in milliseconds since nick is idle
            data.idleTime = Date.now() - data.idle * 1000;
            // Absolute datetime in milliseconds when nick logged on.
            data.logonTime = data.logon * 1000;
            msg = new msg_1.default({
                type: msg_1.MessageType.WHOIS,
                whois: data,
            });
        }
        chan.pushMessage(client, msg);
    }
});
