"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../../config"));
let add, reset;
if (!config_1.default.values.ldap.enable) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    add = require("./add").default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    reset = require("./reset").default;
}
const list_1 = __importDefault(require("./list"));
const remove_1 = __importDefault(require("./remove"));
const edit_1 = __importDefault(require("./edit"));
exports.default = [list_1.default, remove_1.default, edit_1.default, add, reset];
