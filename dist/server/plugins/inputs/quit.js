"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const clientCertificate_1 = __importDefault(require("../clientCertificate"));
const commands = ["quit"];
const allowDisconnected = true;
const input = function (network, chan, cmd, args) {
    const client = this;
    client.networks = lodash_1.default.without(client.networks, network);
    network.destroy();
    client.save();
    client.emit("quit", {
        network: network.uuid,
    });
    const quitMessage = args[0] ? args.join(" ") : undefined;
    network.quit(quitMessage);
    clientCertificate_1.default.remove(network.uuid);
    return true;
};
exports.default = {
    commands,
    input,
    allowDisconnected,
};
