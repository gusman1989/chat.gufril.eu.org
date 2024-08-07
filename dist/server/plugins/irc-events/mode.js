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
const lodash_1 = __importDefault(require("lodash"));
const msg_1 = __importStar(require("../../models/msg"));
exports.default = (function (irc, network) {
    const client = this;
    // The following saves the channel key based on channel mode instead of
    // extracting it from `/join #channel key`. This lets us not have to
    // temporarily store the key until successful join, but also saves the key
    // if a key is set or changed while being on the channel.
    irc.on("channel info", function (data) {
        if (!data.modes) {
            return;
        }
        const targetChan = network.getChannel(data.channel);
        if (typeof targetChan === "undefined") {
            return;
        }
        data.modes.forEach((mode) => {
            const text = mode.mode;
            const add = text[0] === "+";
            const char = text[1];
            if (char === "k") {
                targetChan.key = add ? mode.param : "";
                client.save();
            }
        });
        const msg = new msg_1.default({
            type: msg_1.MessageType.MODE_CHANNEL,
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            text: `${data.raw_modes} ${data.raw_params.join(" ")}`,
        });
        targetChan.pushMessage(client, msg);
    });
    irc.on("user info", function (data) {
        const serverChan = network.getLobby();
        const msg = new msg_1.default({
            type: msg_1.MessageType.MODE_USER,
            raw_modes: data.raw_modes,
            self: false,
            showInActive: true,
        });
        serverChan.pushMessage(client, msg);
    });
    irc.on("mode", function (data) {
        let targetChan;
        if (data.target === irc.user.nick) {
            targetChan = network.getLobby();
        }
        else {
            targetChan = network.getChannel(data.target);
            if (typeof targetChan === "undefined") {
                return;
            }
        }
        const msg = new msg_1.default({
            time: data.time,
            type: msg_1.MessageType.MODE,
            from: targetChan.getUser(data.nick),
            text: `${data.raw_modes} ${data.raw_params.join(" ")}`,
            self: data.nick === irc.user.nick,
        });
        const users = [];
        for (const param of data.raw_params) {
            if (targetChan.findUser(param)) {
                users.push(param);
            }
        }
        if (users.length > 0) {
            msg.users = users;
        }
        targetChan.pushMessage(client, msg);
        let usersUpdated = false;
        const userModeSortPriority = {};
        const supportsMultiPrefix = network.irc.network.cap.isEnabled("multi-prefix");
        irc.network.options.PREFIX.forEach((prefix, index) => {
            userModeSortPriority[prefix.symbol] = index;
        });
        data.modes.forEach((mode) => {
            const add = mode.mode[0] === "+";
            const char = mode.mode[1];
            if (char === "k") {
                targetChan.key = add ? mode.param : "";
                client.save();
            }
            if (!mode.param) {
                return;
            }
            const user = targetChan.findUser(mode.param);
            if (!user) {
                return;
            }
            usersUpdated = true;
            if (!supportsMultiPrefix) {
                return;
            }
            const changedMode = network.serverOptions.PREFIX.modeToSymbol[char];
            if (!add) {
                lodash_1.default.pull(user.modes, changedMode);
            }
            else if (!user.modes.includes(changedMode)) {
                user.modes.push(changedMode);
                user.modes.sort(function (a, b) {
                    return userModeSortPriority[a] - userModeSortPriority[b];
                });
            }
        });
        if (!usersUpdated) {
            return;
        }
        if (!supportsMultiPrefix) {
            // TODO: This is horrible
            irc.raw("NAMES", data.target);
        }
        else {
            client.emit("users", {
                chan: targetChan.id,
            });
        }
    });
});
