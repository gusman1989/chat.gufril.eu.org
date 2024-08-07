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
    irc.on("nick", function (data) {
        const self = data.nick === irc.user.nick;
        if (self) {
            network.setNick(data.new_nick);
            const lobby = network.getLobby();
            const msg = new msg_1.default({
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                text: `You're now known as ${data.new_nick}`,
            });
            lobby.pushMessage(client, msg, true);
            client.save();
            client.emit("nick", {
                network: network.uuid,
                nick: data.new_nick,
            });
        }
        network.channels.forEach((chan) => {
            const user = chan.findUser(data.nick);
            if (typeof user === "undefined") {
                return;
            }
            const msg = new msg_1.default({
                time: data.time,
                from: user,
                type: msg_1.MessageType.NICK,
                new_nick: data.new_nick,
            });
            chan.pushMessage(client, msg);
            chan.removeUser(user);
            user.nick = data.new_nick;
            chan.setUser(user);
            client.emit("users", {
                chan: chan.id,
            });
        });
    });
});
