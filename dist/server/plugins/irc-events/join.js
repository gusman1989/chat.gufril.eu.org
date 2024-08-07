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
const user_1 = __importDefault(require("../../models/user"));
const chan_1 = require("../../models/chan");
exports.default = (function (irc, network) {
    const client = this;
    irc.on("join", function (data) {
        let chan = network.getChannel(data.channel);
        if (typeof chan === "undefined") {
            chan = client.createChannel({
                name: data.channel,
                state: chan_1.ChanState.JOINED,
            });
            client.emit("join", {
                network: network.uuid,
                chan: chan.getFilteredClone(true),
                index: network.addChannel(chan),
            });
            client.save();
            chan.loadMessages(client, network);
            // Request channels' modes
            network.irc.raw("MODE", chan.name);
        }
        else if (data.nick === irc.user.nick) {
            chan.state = chan_1.ChanState.JOINED;
            client.emit("channel:state", {
                chan: chan.id,
                state: chan.state,
            });
        }
        const user = new user_1.default({ nick: data.nick });
        const msg = new msg_1.default({
            time: data.time,
            from: user,
            hostmask: data.ident + "@" + data.hostname,
            gecos: data.gecos,
            account: data.account,
            type: msg_1.MessageType.JOIN,
            self: data.nick === irc.user.nick,
        });
        chan.pushMessage(client, msg);
        chan.setUser(new user_1.default({ nick: data.nick }));
        client.emit("users", {
            chan: chan.id,
        });
    });
});
