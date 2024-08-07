"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("../../log"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("../../config"));
const utils_1 = __importDefault(require("../utils"));
const program = new commander_1.Command("remove");
program
    .description("Remove an existing user")
    .on("--help", utils_1.default.extraHelp)
    .argument("<name>", "name of the user")
    .action(function (name) {
    if (!fs_1.default.existsSync(config_1.default.getUsersPath())) {
        log_1.default.error(`${config_1.default.getUsersPath()} does not exist.`);
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ClientManager = require("../../clientManager").default;
    const manager = new ClientManager();
    try {
        if (manager.removeUser(name)) {
            log_1.default.info(`User ${chalk_1.default.bold(name)} removed.`);
        }
        else {
            log_1.default.error(`User ${chalk_1.default.bold(name)} does not exist.`);
        }
    }
    catch (e) {
        // There was an error, already logged
    }
});
exports.default = program;
