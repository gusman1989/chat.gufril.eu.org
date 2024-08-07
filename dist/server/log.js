"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const read_1 = __importDefault(require("read"));
function timestamp() {
    const datetime = new Date().toISOString().split(".")[0].replace("T", " ");
    return chalk_1.default.dim(datetime);
}
const log = {
    /* eslint-disable no-console */
    error(...args) {
        console.error(timestamp(), chalk_1.default.red("[ERROR]"), ...args);
    },
    warn(...args) {
        console.error(timestamp(), chalk_1.default.yellow("[WARN]"), ...args);
    },
    info(...args) {
        console.log(timestamp(), chalk_1.default.blue("[INFO]"), ...args);
    },
    debug(...args) {
        console.log(timestamp(), chalk_1.default.green("[DEBUG]"), ...args);
    },
    raw(...args) {
        console.log(...args);
    },
    /* eslint-enable no-console */
    prompt(options, callback) {
        options.prompt = [timestamp(), chalk_1.default.cyan("[PROMPT]"), options.text].join(" ");
        (0, read_1.default)(options, callback);
    },
};
exports.default = log;
