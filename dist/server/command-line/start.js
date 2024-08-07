"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("../log"));
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const commander_1 = require("commander");
const config_1 = __importDefault(require("../config"));
const utils_1 = __importDefault(require("./utils"));
const program = new commander_1.Command("start");
program
    .description("Start the server")
    .option("--dev", "Development mode with hot module reloading")
    .on("--help", utils_1.default.extraHelp)
    .action(function (options) {
    initalizeConfig();
    const newLocal = "../server";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const server = require(newLocal);
    server.default(options);
});
function initalizeConfig() {
    if (!fs_1.default.existsSync(config_1.default.getConfigPath())) {
        fs_1.default.mkdirSync(config_1.default.getHomePath(), { recursive: true });
        fs_1.default.chmodSync(config_1.default.getHomePath(), "0700");
        fs_1.default.copyFileSync(path_1.default.resolve(path_1.default.join(__dirname, "..", "..", "defaults", "config.js")), config_1.default.getConfigPath());
        log_1.default.info(`Configuration file created at ${chalk_1.default.green(config_1.default.getConfigPath())}.`);
    }
    fs_1.default.mkdirSync(config_1.default.getUsersPath(), { recursive: true, mode: 0o700 });
}
exports.default = program;
