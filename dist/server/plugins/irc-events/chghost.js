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
    // If server supports CHGHOST cap, then changing the hostname does not require
    // sending PART and JOIN, which means less work for us over all
    irc.on("user updated", function (data) {
        network.channels.forEach((chan) => {
            const user = chan.findUser(data.nick);
            if (typeof user === "undefined") {
                return;
            }
            const msg = new msg_1.default({
                time: data.time,
                type: msg_1.MessageType.CHGHOST,
                new_ident: data.ident !== data.new_ident ? data.new_ident : "",
                new_host: data.hostname !== data.new_hostname ? data.new_hostname : "",
                self: data.nick === irc.user.nick,
                from: user,
            });
            chan.pushMessage(client, msg);
        });
    });
});