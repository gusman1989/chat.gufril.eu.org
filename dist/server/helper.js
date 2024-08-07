"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_json_1 = __importDefault(require("../package.json"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const net_1 = __importDefault(require("net"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const Helper = {
    expandHome,
    getVersion,
    getVersionCacheBust,
    getVersionNumber,
    getGitCommit,
    ip2hex,
    parseHostmask,
    compareHostmask,
    compareWithWildcard,
    catch_to_error,
    password: {
        hash: passwordHash,
        compare: passwordCompare,
        requiresUpdate: passwordRequiresUpdate,
    },
};
exports.default = Helper;
function getVersion() {
    const gitCommit = getGitCommit();
    const version = `v${package_json_1.default.version}`;
    return gitCommit ? `source (${gitCommit} / ${version})` : version;
}
function getVersionNumber() {
    return package_json_1.default.version;
}
let _fetchedGitCommit = false;
let _gitCommit = null;
function getGitCommit() {
    if (_fetchedGitCommit) {
        return _gitCommit;
    }
    _fetchedGitCommit = true;
    // --git-dir ".git" makes git only check current directory for `.git`, and not travel upwards
    // We set cwd to the location of `index.js` as soon as the process is started
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        _gitCommit = require("child_process")
            .execSync('git --git-dir ".git" rev-parse --short HEAD', // Returns hash of current commit
        { stdio: ["ignore", "pipe", "ignore"] })
            .toString()
            .trim();
        return _gitCommit;
    }
    catch (e) {
        // Not a git repository or git is not installed
        _gitCommit = null;
        return null;
    }
}
function getVersionCacheBust() {
    const hash = crypto_1.default.createHash("sha256").update(Helper.getVersion()).digest("hex");
    return hash.substring(0, 10);
}
function ip2hex(address) {
    // no ipv6 support
    if (!net_1.default.isIPv4(address)) {
        return "00000000";
    }
    return address
        .split(".")
        .map(function (octet) {
        let hex = parseInt(octet, 10).toString(16);
        if (hex.length === 1) {
            hex = "0" + hex;
        }
        return hex;
    })
        .join("");
}
// Expand ~ into the current user home dir.
// This does *not* support `~other_user/tmp` => `/home/other_user/tmp`.
function expandHome(shortenedPath) {
    if (!shortenedPath) {
        return "";
    }
    const home = os_1.default.homedir().replace("$", "$$$$");
    return path_1.default.resolve(shortenedPath.replace(/^~($|\/|\\)/, home + "$1"));
}
function passwordRequiresUpdate(password) {
    return bcryptjs_1.default.getRounds(password) !== 11;
}
function passwordHash(password) {
    return bcryptjs_1.default.hashSync(password, bcryptjs_1.default.genSaltSync(11));
}
function passwordCompare(password, expected) {
    return bcryptjs_1.default.compare(password, expected);
}
function parseHostmask(hostmask) {
    let nick = "";
    let ident = "*";
    let hostname = "*";
    let parts = [];
    // Parse hostname first, then parse the rest
    parts = hostmask.split("@");
    if (parts.length >= 2) {
        hostname = parts[1] || "*";
        hostmask = parts[0];
    }
    hostname = hostname.toLowerCase();
    parts = hostmask.split("!");
    if (parts.length >= 2) {
        ident = parts[1] || "*";
        hostmask = parts[0];
    }
    ident = ident.toLowerCase();
    nick = hostmask.toLowerCase() || "*";
    const result = {
        nick: nick,
        ident: ident,
        hostname: hostname,
    };
    return result;
}
function compareHostmask(a, b) {
    return (compareWithWildcard(a.nick, b.nick) &&
        compareWithWildcard(a.ident, b.ident) &&
        compareWithWildcard(a.hostname, b.hostname));
}
function compareWithWildcard(a, b) {
    // we allow '*' and '?' wildcards in our comparison.
    // this is mostly aligned with https://modern.ircdocs.horse/#wildcard-expressions
    // but we do not support the escaping. The ABNF does not seem to be clear as to
    // how to escape the escape char '\', which is valid in a nick,
    // whereas the wildcards tend not to be (as per RFC1459).
    // The "*" wildcard is ".*" in regex, "?" is "."
    // so we tokenize and join with the proper char back together,
    // escaping any other regex modifier
    const wildmany_split = a.split("*").map((sub) => {
        const wildone_split = sub.split("?").map((p) => lodash_1.default.escapeRegExp(p));
        return wildone_split.join(".");
    });
    const user_regex = wildmany_split.join(".*");
    const re = new RegExp(`^${user_regex}$`, "i"); // case insensitive
    return re.test(b);
}
function catch_to_error(prefix, err) {
    let msg;
    if (err instanceof Error) {
        msg = err.message;
    }
    else if (typeof err === "string") {
        msg = err;
    }
    else {
        msg = err.toString();
    }
    return new Error(`${prefix}: ${msg}`);
}
