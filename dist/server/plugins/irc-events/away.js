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
    irc.on("away", (data) => handleAway(msg_1.MessageType.AWAY, data));
    irc.on("back", (data) => handleAway(msg_1.MessageType.BACK, data));
    function handleAway(type, data) {
        const away = data.message;
        if (data.self) {
            const msg = new msg_1.default({
                self: true,
                type: type,
                text: away,
                time: data.time,
            });
            network.getLobby().pushMessage(client, msg, true);
            return;
        }
        network.channels.forEach((chan) => {
            let user;
            switch (chan.type) {
                case chan_1.ChanType.QUERY: {
                    if (data.nick.toLowerCase() !== chan.name.toLowerCase()) {
                        return;
                    }
                    if (chan.userAway === away) {
                        return;
                    }
                    // Store current away message on channel model,
                    // because query windows have no users
                    chan.userAway = away;
                    user = chan.getUser(data.nick);
                    const msg = new msg_1.default({
                        type: type,
                        text: away || "",
                        time: data.time,
                        from: user,
                    });
                    chan.pushMessage(client, msg);
                    break;
                }
                case chan_1.ChanType.CHANNEL: {
                    user = chan.findUser(data.nick);
                    if (!user || user.away === away) {
                        return;
                    }
                    user.away = away;
                    break;
                }
            }
        });
    }
});
