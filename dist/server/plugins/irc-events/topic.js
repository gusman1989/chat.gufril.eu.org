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
    irc.on("topic", function (data) {
        const chan = network.getChannel(data.channel);
        if (typeof chan === "undefined") {
            return;
        }
        const msg = new msg_1.default({
            time: data.time,
            type: msg_1.MessageType.TOPIC,
            from: data.nick && chan.getUser(data.nick),
            text: data.topic,
            self: data.nick === irc.user.nick,
        });
        chan.pushMessage(client, msg);
        chan.topic = data.topic;
        client.emit("topic", {
            chan: chan.id,
            topic: chan.topic,
        });
    });
    irc.on("topicsetby", function (data) {
        const chan = network.getChannel(data.channel);
        if (typeof chan === "undefined") {
            return;
        }
        const msg = new msg_1.default({
            type: msg_1.MessageType.TOPIC_SET_BY,
            from: chan.getUser(data.nick),
            when: new Date(data.when * 1000),
            self: data.nick === irc.user.nick,
        });
        chan.pushMessage(client, msg);
    });
});
