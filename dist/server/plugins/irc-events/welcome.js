"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const msg_1 = __importDefault(require("../../models/msg"));
exports.default = (function (irc, network) {
    const client = this;
    irc.on("registered", function (data) {
        network.setNick(data.nick);
        const lobby = network.getLobby();
        const msg = new msg_1.default({
            text: "You're now known as " + data.nick,
        });
        lobby.pushMessage(client, msg);
        client.save();
        client.emit("nick", {
            network: network.uuid,
            nick: data.nick,
        });
    });
});
