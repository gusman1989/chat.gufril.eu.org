"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
const lodash_1 = __importDefault(require("lodash"));
var MessageType;
(function (MessageType) {
    MessageType["UNHANDLED"] = "unhandled";
    MessageType["ACTION"] = "action";
    MessageType["AWAY"] = "away";
    MessageType["BACK"] = "back";
    MessageType["ERROR"] = "error";
    MessageType["INVITE"] = "invite";
    MessageType["JOIN"] = "join";
    MessageType["KICK"] = "kick";
    MessageType["LOGIN"] = "login";
    MessageType["LOGOUT"] = "logout";
    MessageType["MESSAGE"] = "message";
    MessageType["MODE"] = "mode";
    MessageType["MODE_CHANNEL"] = "mode_channel";
    MessageType["MODE_USER"] = "mode_user";
    MessageType["MONOSPACE_BLOCK"] = "monospace_block";
    MessageType["NICK"] = "nick";
    MessageType["NOTICE"] = "notice";
    MessageType["PART"] = "part";
    MessageType["QUIT"] = "quit";
    MessageType["CTCP"] = "ctcp";
    MessageType["CTCP_REQUEST"] = "ctcp_request";
    MessageType["CHGHOST"] = "chghost";
    MessageType["TOPIC"] = "topic";
    MessageType["TOPIC_SET_BY"] = "topic_set_by";
    MessageType["WHOIS"] = "whois";
    MessageType["RAW"] = "raw";
    MessageType["PLUGIN"] = "plugin";
    MessageType["WALLOPS"] = "wallops";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
class Msg {
    from;
    id;
    previews;
    text;
    type;
    self;
    time;
    hostmask;
    target;
    // TODO: new_nick is only on MessageType.NICK,
    // we should probably make Msgs that extend this class and use those
    // throughout. I'll leave any similar fields below.
    new_nick;
    highlight;
    showInActive;
    new_ident;
    new_host;
    ctcpMessage;
    command;
    invitedYou;
    gecos;
    account;
    // these are all just for error:
    error;
    nick;
    channel;
    reason;
    raw_modes;
    when;
    whois;
    users;
    statusmsgGroup;
    params;
    constructor(attr) {
        // Some properties need to be copied in the Msg object instead of referenced
        if (attr) {
            ["from", "target"].forEach((prop) => {
                if (attr[prop]) {
                    this[prop] = {
                        mode: attr[prop].mode,
                        nick: attr[prop].nick,
                    };
                }
            });
        }
        lodash_1.default.defaults(this, attr, {
            from: {},
            id: 0,
            previews: [],
            text: "",
            type: MessageType.MESSAGE,
            self: false,
        });
        if (this.time) {
            this.time = new Date(this.time);
        }
        else {
            this.time = new Date();
        }
    }
    findPreview(link) {
        return this.previews.find((preview) => preview.link === link);
    }
    isLoggable() {
        if (this.type === MessageType.TOPIC) {
            // Do not log topic that is sent on channel join
            return !!this.from.nick;
        }
        switch (this.type) {
            case MessageType.MONOSPACE_BLOCK:
            case MessageType.ERROR:
            case MessageType.TOPIC_SET_BY:
            case MessageType.MODE_CHANNEL:
            case MessageType.MODE_USER:
            case MessageType.RAW:
            case MessageType.WHOIS:
            case MessageType.PLUGIN:
                return false;
            default:
                return true;
        }
    }
}
exports.default = Msg;
