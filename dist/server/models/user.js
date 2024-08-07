"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const prefix_1 = __importDefault(require("./prefix"));
class User {
    modes;
    // Users in the channel have only one mode assigned
    mode;
    away;
    nick;
    lastMessage;
    constructor(attr, prefix) {
        lodash_1.default.defaults(this, attr, {
            modes: [],
            away: "",
            nick: "",
            lastMessage: 0,
        });
        Object.defineProperty(this, "mode", {
            get() {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return this.modes[0] || "";
            },
        });
        this.setModes(this.modes, prefix || new prefix_1.default([]));
    }
    setModes(modes, prefix) {
        // irc-framework sets character mode, but The Lounge works with symbols
        this.modes = modes.map((mode) => prefix.modeToSymbol[mode]);
    }
    toJSON() {
        return {
            nick: this.nick,
            modes: this.modes,
            lastMessage: this.lastMessage,
        };
    }
}
exports.default = User;
