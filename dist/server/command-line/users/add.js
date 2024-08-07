"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("../../log"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const helper_1 = __importDefault(require("../../helper"));
const config_1 = __importDefault(require("../../config"));
const utils_1 = __importDefault(require("../utils"));
const program = new commander_1.Command("add");
program
    .description("Add a new user")
    .on("--help", utils_1.default.extraHelp)
    .option("--password [password]", "new password, will be prompted if not specified")
    .option("--save-logs", "if password is specified, this enables saving logs to disk")
    .argument("<name>", "name of the user")
    .action(function (name, cmdObj) {
    if (!fs_1.default.existsSync(config_1.default.getUsersPath())) {
        log_1.default.error(`${config_1.default.getUsersPath()} does not exist.`);
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ClientManager = require("../../clientManager").default;
    const manager = new ClientManager();
    const users = manager.getUsers();
    if (users === undefined) {
        // There was an error, already logged
        return;
    }
    if (users.includes(name)) {
        log_1.default.error(`User ${chalk_1.default.bold(name)} already exists.`);
        return;
    }
    if (cmdObj.password) {
        add(manager, name, cmdObj.password, !!cmdObj.saveLogs);
        return;
    }
    log_1.default.prompt({
        text: "Enter password:",
        silent: true,
    }, function (err, password) {
        if (!password) {
            log_1.default.error("Password cannot be empty.");
            return;
        }
        if (!err) {
            log_1.default.prompt({
                text: "Save logs to disk?",
                default: "yes",
            }, function (err2, enableLog) {
                if (!err2) {
                    add(manager, name, password, enableLog.charAt(0).toLowerCase() === "y");
                }
            });
        }
    });
});
function add(manager, name, password, enableLog) {
    const hash = helper_1.default.password.hash(password);
    manager.addUser(name, hash, enableLog);
    log_1.default.info(`User ${chalk_1.default.bold(name)} created.`);
    log_1.default.info(`User file located at ${chalk_1.default.green(config_1.default.getUserConfigPath(name))}.`);
}
exports.default = program;
