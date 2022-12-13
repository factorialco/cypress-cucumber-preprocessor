"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIsString = exports.assertAndReturn = exports.assert = exports.fail = void 0;
const type_guards_1 = require("./type-guards");
const package_json_1 = require("../package.json");
function fail(message) {
    throw new Error(`${message} (this might be a bug, please report at ${package_json_1.homepage})`);
}
exports.fail = fail;
function assert(value, message) {
    if (value != null) {
        return;
    }
    fail(message);
}
exports.assert = assert;
function assertAndReturn(value, message) {
    assert(value, message);
    return value;
}
exports.assertAndReturn = assertAndReturn;
function assertIsString(value, message) {
    assert((0, type_guards_1.isString)(value), message);
}
exports.assertIsString = assertIsString;