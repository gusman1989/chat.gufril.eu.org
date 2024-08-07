"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const chalk_1 = __importDefault(require("chalk"));
const log_1 = __importDefault(require("../log"));
const package_json_1 = __importDefault(require("../../package.json"));
const config_1 = __importDefault(require("../config"));
const TIME_TO_LIVE = 15 * 60 * 1000; // 15 minutes, in milliseconds
exports.default = {
    isUpdateAvailable: false,
    fetch,
    checkForUpdates,
};
const versions = {
    current: {
        version: `v${package_json_1.default.version}`,
        changelog: undefined,
    },
    expiresAt: -1,
    latest: undefined,
    packages: undefined,
};
async function fetch() {
    const time = Date.now();
    // Serving information from cache
    if (versions.expiresAt > time) {
        return versions;
    }
    try {
        const response = await (0, got_1.default)("https://api.github.com/repos/thelounge/thelounge/releases", {
            headers: {
                Accept: "application/vnd.github.v3.html",
                "User-Agent": package_json_1.default.name + "; +" + package_json_1.default.repository.url, // Identify the client
            },
            localAddress: config_1.default.values.bind,
        });
        if (response.statusCode !== 200) {
            return versions;
        }
        updateVersions(response);
        // Add expiration date to the data to send to the client for later refresh
        versions.expiresAt = time + TIME_TO_LIVE;
    }
    catch (error) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        log_1.default.error(`Failed to fetch changelog: ${error}`);
    }
    return versions;
}
function updateVersions(response) {
    let i;
    let release;
    let prerelease = false;
    const body = JSON.parse(response.body);
    // Find the current release among releases on GitHub
    for (i = 0; i < body.length; i++) {
        release = body[i];
        if (release.tag_name === versions.current.version) {
            versions.current.changelog = release.body_html;
            prerelease = release.prerelease;
            break;
        }
    }
    // Find the latest release made after the current one if there is one
    if (i > 0) {
        for (let j = 0; j < i; j++) {
            release = body[j];
            // Find latest release or pre-release if current version is also a pre-release
            if (!release.prerelease || release.prerelease === prerelease) {
                module.exports.isUpdateAvailable = true;
                versions.latest = {
                    prerelease: release.prerelease,
                    version: release.tag_name,
                    url: release.html_url,
                };
                break;
            }
        }
    }
}
function checkForUpdates(manager) {
    fetch()
        .then((versionData) => {
        if (!module.exports.isUpdateAvailable) {
            // Check for updates every 24 hours + random jitter of <3 hours
            setTimeout(() => checkForUpdates(manager), 24 * 3600 * 1000 + Math.floor(Math.random() * 10000000));
        }
        if (!versionData.latest) {
            return;
        }
        log_1.default.info(`The Lounge ${chalk_1.default.green(versionData.latest.version)} is available. Read more on GitHub: ${versionData.latest.url}`);
        // Notify all connected clients about the new version
        manager.clients.forEach((client) => client.emit("changelog:newversion"));
    })
        .catch((error) => {
        log_1.default.error(`Failed to check for updates: ${error.message}`);
    });
}
