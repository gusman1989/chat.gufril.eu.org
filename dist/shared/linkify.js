"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLinksWithSchema = exports.findLinks = void 0;
const linkify_it_1 = __importDefault(require("linkify-it"));
const tlds_1 = __importDefault(require("tlds"));
const linkify = (0, linkify_it_1.default)().tlds(tlds_1.default).tlds("onion", true);
// Known schemes to detect in text
const commonSchemes = [
    "sftp",
    "smb",
    "file",
    "irc",
    "ircs",
    "svn",
    "git",
    "steam",
    "mumble",
    "ts3server",
    "svn+ssh",
    "ssh",
    "gopher",
    "gemini",
];
for (const schema of commonSchemes) {
    linkify.add(schema + ":", "http:");
}
linkify.add("web+", {
    validate(text, pos, self) {
        const webSchemaRe = /^[a-z]+:/gi;
        if (!webSchemaRe.test(text.slice(pos))) {
            return 0;
        }
        const linkEnd = self.testSchemaAt(text, "http:", pos + webSchemaRe.lastIndex);
        if (linkEnd === 0) {
            return 0;
        }
        return webSchemaRe.lastIndex + linkEnd;
    },
    normalize(match) {
        match.schema = match.text.slice(0, match.text.indexOf(":") + 1);
    },
});
// we must rewrite protocol less urls to http, else if TL is hosted
// on https, this would incorrectly use https for the remote link.
// See https://github.com/thelounge/thelounge/issues/2525
//
// We take the validation logic from linkify and just add our own
// normalizer.
linkify.add("//", {
    validate: linkify.__schemas__["//"].validate,
    normalize(match) {
        match.schema = ""; // this counts as not having a schema
        match.url = "http:" + match.url;
    },
});
function findLinks(text) {
    const matches = linkify.match(text);
    if (!matches) {
        return [];
    }
    return matches.map(makeLinkPart);
}
exports.findLinks = findLinks;
function findLinksWithSchema(text) {
    const matches = linkify.match(text);
    if (!matches) {
        return [];
    }
    return matches.filter((url) => !!url.schema).map(makeLinkPart);
}
exports.findLinksWithSchema = findLinksWithSchema;
function makeLinkPart(url) {
    return {
        start: url.index,
        end: url.lastIndex,
        link: url.url,
    };
}
