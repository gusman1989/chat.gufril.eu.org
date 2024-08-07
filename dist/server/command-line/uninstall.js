"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(require("../log"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const config_1 = __importDefault(require("../config"));
const utils_1 = __importDefault(require("./utils"));
const program = new commander_1.Command("uninstall");
program
    .argument("<package>", "The package to uninstall")
    .description("Uninstall a theme or a package")
    .on("--help", utils_1.default.extraHelp)
    .action(async function (packageName) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs").promises;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require("path");
    const packagesConfig = path.join(config_1.default.getPackagesPath(), "package.json");
    // const packages = JSON.parse(fs.readFileSync(packagesConfig, "utf-8"));
    const packages = JSON.parse(await fs.readFile(packagesConfig, "utf-8"));
    if (!packages.dependencies ||
        !Object.prototype.hasOwnProperty.call(packages.dependencies, packageName)) {
        log_1.default.warn(`${chalk_1.default.green(packageName)} is not installed.`);
        process.exit(1);
    }
    log_1.default.info(`Uninstalling ${chalk_1.default.green(packageName)}...`);
    try {
        await utils_1.default.executeYarnCommand("remove", packageName);
        log_1.default.info(`${chalk_1.default.green(packageName)} has been successfully uninstalled.`);
    }
    catch (code_1) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        log_1.default.error(`Failed to uninstall ${chalk_1.default.green(packageName)}. Exit code: ${code_1}`);
        process.exit(1);
    }
});
exports.default = program;
