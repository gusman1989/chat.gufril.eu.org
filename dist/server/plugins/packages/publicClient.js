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
class PublicClient {
    client;
    packageInfo;
    constructor(client, packageInfo) {
        this.client = client;
        this.packageInfo = packageInfo;
    }
    /**
     *
     * @param {String} command - IRC command to run, this is in the same format that a client would send to the server (eg: JOIN #test)
     * @param {String} targetId - The id of the channel to simulate the command coming from. Replies will go to this channel if appropriate
     */
    runAsUser(command, targetId) {
        this.client.inputLine({ target: targetId, text: command });
    }
    /**
     *
     * @param {Object} attributes
     */
    createChannel(attributes) {
        return this.client.createChannel(attributes);
    }
    /**
     * Emits an `event` to the browser client, with `data` in the body of the event.
     *
     * @param {String} event - Name of the event, must be something the browser will recognise
     * @param {Object} data - Body of the event, can be anything, but will need to be properly interpreted by the client
     */
    sendToBrowser(event, data) {
        this.client.emit(event, data);
    }
    /**
     *
     * @param {Number} chanId
     */
    getChannel(chanId) {
        return this.client.find(chanId);
    }
    /**
     * Sends a message to this client, displayed in the given channel.
     *
     * @param {String} text the message to send
     * @param {Chan} chan the channel to send the message to
     */
    sendMessage(text, chan) {
        chan.pushMessage(this.client, new msg_1.default({
            type: msg_1.MessageType.PLUGIN,
            text: text,
            from: {
                nick: this.packageInfo.name || this.packageInfo.packageName,
            },
        }));
    }
}
exports.default = PublicClient;
