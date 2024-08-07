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
const log_1 = __importDefault(require("../../log"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const utils_1 = __importDefault(require("../utils"));
const program = new commander_1.Command("list");
program
    .description("List all users")
    .on("--help", utils_1.default.extraHelp)
    .action(async function () {
    const ClientManager = (await Promise.resolve().then(() => __importStar(require("../../clientManager")))).default;
    const users = new ClientManager().getUsers();
    if (users === undefined) {
        // There was an error, already logged
        return;
    }
    if (users.length === 0) {
        log_1.default.info(`There are currently no users. Create one with ${chalk_1.default.bold("thelounge add <name>")}.`);
        return;
    }
    log_1.default.info("Users:");
    users.forEach((user, i) => {
        log_1.default.info(`${i + 1}. ${chalk_1.default.bold(user)}`);
    });
});
exports.default = program;
