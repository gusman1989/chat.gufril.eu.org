"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const log_1 = __importDefault(require("../../log"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const helper_1 = __importDefault(require("../../helper"));
const config_1 = __importDefault(require("../../config"));
const themes_1 = __importDefault(require("./themes"));
const inputs_1 = __importDefault(require("../inputs"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = __importDefault(require("../../command-line/utils"));
const packageMap = new Map();
const stylesheets = [];
const files = [];
const TIME_TO_LIVE = 15 * 60 * 1000; // 15 minutes, in milliseconds
const cache = {
    outdated: undefined,
};
let experimentalWarningPrinted = false;
exports.default = {
    getFiles,
    getStylesheets,
    getPackage,
    loadPackages,
    outdated,
};
// TODO: verify binds worked. Used to be 'this' instead of 'packageApis'
const packageApis = function (packageInfo) {
    return {
        Stylesheets: {
            addFile: addStylesheet.bind(packageApis, packageInfo.packageName),
        },
        PublicFiles: {
            add: addFile.bind(packageApis, packageInfo.packageName),
        },
        Commands: {
            add: inputs_1.default.addPluginCommand.bind(packageApis, packageInfo),
            runAsUser: (command, targetId, client) => client.inputLine({ target: targetId, text: command }),
        },
        Config: {
            getConfig: () => config_1.default.values,
            getPersistentStorageDir: getPersistentStorageDir.bind(packageApis, packageInfo.packageName),
        },
        Logger: {
            error: (...args) => log_1.default.error(`[${packageInfo.packageName}]`, ...args),
            warn: (...args) => log_1.default.warn(`[${packageInfo.packageName}]`, ...args),
            info: (...args) => log_1.default.info(`[${packageInfo.packageName}]`, ...args),
            debug: (...args) => log_1.default.debug(`[${packageInfo.packageName}]`, ...args),
        },
    };
};
function addStylesheet(packageName, filename) {
    stylesheets.push(packageName + "/" + filename);
}
function getStylesheets() {
    return stylesheets;
}
function addFile(packageName, filename) {
    files.push(packageName + "/" + filename);
}
function getFiles() {
    return files.concat(stylesheets);
}
function getPackage(name) {
    return packageMap.get(name);
}
function getEnabledPackages(packageJson) {
    try {
        const json = JSON.parse(fs_1.default.readFileSync(packageJson, "utf-8"));
        return Object.keys(json.dependencies);
    }
    catch (e) {
        log_1.default.error(`Failed to read packages/package.json: ${chalk_1.default.red(e)}`);
    }
    return [];
}
function getPersistentStorageDir(packageName) {
    const dir = path_1.default.join(config_1.default.getPackagesPath(), packageName);
    fs_1.default.mkdirSync(dir, { recursive: true }); // we don't care if it already exists or not
    return dir;
}
function loadPackage(packageName) {
    let packageInfo;
    // TODO: type
    let packageFile;
    try {
        const packagePath = config_1.default.getPackageModulePath(packageName);
        packageInfo = JSON.parse(fs_1.default.readFileSync(path_1.default.join(packagePath, "package.json"), "utf-8"));
        if (!packageInfo.thelounge) {
            throw "'thelounge' is not present in package.json";
        }
        if (packageInfo.thelounge.supports &&
            !semver_1.default.satisfies(helper_1.default.getVersionNumber(), packageInfo.thelounge.supports, {
                includePrerelease: true, // our pre-releases should respect the semver guarantees
            })) {
            throw `v${packageInfo.version} does not support this version of The Lounge. Supports: ${packageInfo.thelounge.supports}`;
        }
        packageFile = require(packagePath);
    }
    catch (e) {
        log_1.default.error(`Package ${chalk_1.default.bold(packageName)} could not be loaded: ${chalk_1.default.red(e)}`);
        if (e instanceof Error) {
            log_1.default.debug(e.stack ? e.stack : e.message);
        }
        return;
    }
    const version = packageInfo.version;
    packageInfo = {
        ...packageInfo.thelounge,
        packageName: packageName,
        version,
    };
    packageMap.set(packageName, packageFile);
    if (packageInfo.type === "theme") {
        // @ts-expect-error Argument of type 'PackageInfo' is not assignable to parameter of type 'ThemeModule'.
        themes_1.default.addTheme(packageName, packageInfo);
        if (packageInfo.files) {
            packageInfo.files.forEach((file) => addFile(packageName, file));
        }
    }
    if (packageFile.onServerStart) {
        packageFile.onServerStart(packageApis(packageInfo));
    }
    log_1.default.info(`Package ${chalk_1.default.bold(packageName)} ${chalk_1.default.green("v" + version)} loaded`);
    if (packageInfo.type !== "theme" && !experimentalWarningPrinted) {
        experimentalWarningPrinted = true;
        log_1.default.info("There are packages using the experimental plugin API. " +
            "Be aware that this API is not yet stable and may change in future The Lounge releases.");
    }
}
function loadPackages() {
    const packageJson = path_1.default.join(config_1.default.getPackagesPath(), "package.json");
    const packages = getEnabledPackages(packageJson);
    packages.forEach(loadPackage);
    watchPackages(packageJson);
}
function watchPackages(packageJson) {
    fs_1.default.watch(packageJson, {
        persistent: false,
    }, lodash_1.default.debounce(() => {
        const updated = getEnabledPackages(packageJson);
        for (const packageName of updated) {
            if (packageMap.has(packageName)) {
                continue;
            }
            loadPackage(packageName);
        }
    }, 1000, { maxWait: 10000 }));
}
async function outdated(cacheTimeout = TIME_TO_LIVE) {
    if (cache.outdated !== undefined) {
        return cache.outdated;
    }
    // Get paths to the location of packages directory
    const packagesPath = config_1.default.getPackagesPath();
    const packagesConfig = path_1.default.join(packagesPath, "package.json");
    const packagesList = JSON.parse(fs_1.default.readFileSync(packagesConfig, "utf-8")).dependencies;
    const argsList = [
        "outdated",
        "--latest",
        "--json",
        "--production",
        "--ignore-scripts",
        "--non-interactive",
        "--cwd",
        packagesPath,
    ];
    // Check if the configuration file exists
    if (!Object.entries(packagesList).length) {
        // CLI calls outdated with zero TTL, so we can print the warning there
        if (!cacheTimeout) {
            log_1.default.warn("There are no packages installed.");
        }
        return false;
    }
    const command = argsList.shift();
    const params = argsList;
    if (!command) {
        return;
    }
    // If we get an error from calling outdated and the code isn't 0, then there are no outdated packages
    // TODO: was (...argsList), verify this works
    await utils_1.default.executeYarnCommand(command, ...params)
        .then(() => updateOutdated(false))
        .catch((code) => updateOutdated(code !== 0));
    if (cacheTimeout > 0) {
        setTimeout(() => {
            delete cache.outdated;
        }, cacheTimeout);
    }
    return cache.outdated;
}
function updateOutdated(outdatedPackages) {
    cache.outdated = outdatedPackages;
}
