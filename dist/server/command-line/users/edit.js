"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("../../log"));
const commander_1 = require("commander");
const child_process_1 = __importDefault(require("child_process"));
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("../../config"));
const utils_1 = __importDefault(require("../utils"));
const program = new commander_1.Command("edit");
program
    .description(`Edit user file located at ${chalk_1.default.green(config_1.default.getUserConfigPath("<name>"))}`)
    .argument("<name>", "name of the user")
    .on("--help", utils_1.default.extraHelp)
    .action(function (name) {
    if (!fs_1.default.existsSync(config_1.default.getUsersPath())) {
        log_1.default.error(`${config_1.default.getUsersPath()} does not exist.`);
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ClientManager = require("../../clientManager").default;
    const users = new ClientManager().getUsers();
    if (users === undefined) {
        // There was an error, already logged
        return;
    }
    if (!users.includes(name)) {
        log_1.default.error(`User ${chalk_1.default.bold(name)} does not exist.`);
        return;
    }
    const child_spawn = child_process_1.default.spawn(process.env.EDITOR || "vi", [config_1.default.getUserConfigPath(name)], { stdio: "inherit" });
    child_spawn.on("error", function () {
        log_1.default.error(`Unable to open ${chalk_1.default.green(config_1.default.getUserConfigPath(name))}. ${chalk_1.default.bold("$EDITOR")} is not set, and ${chalk_1.default.bold("vi")} was not found.`);
    });
});
exports.default = program;
