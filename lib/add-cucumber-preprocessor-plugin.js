"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebuildOriginalConfigObject = exports.mutateConfigObjectPreservingly = exports.afterScreenshotHandler = exports.afterSpecHandler = exports.beforeSpecHandler = exports.afterRunHandler = exports.beforeRunHandler = void 0;
const fs_1 = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = __importDefault(require("child_process"));
const stream_1 = __importDefault(require("stream"));
const chalk_1 = __importDefault(require("chalk"));
const resolve_pkg_1 = __importDefault(require("resolve-pkg"));
const message_streams_1 = require("@cucumber/message-streams");
const html_formatter_1 = __importDefault(require("@cucumber/html-formatter"));
const messages_1 = require("@cucumber/messages");
const tag_expressions_1 = __importDefault(require("@cucumber/tag-expressions"));
const gherkin_1 = require("@cucumber/gherkin");
const cypress_configuration_1 = require("@badeball/cypress-configuration");
const constants_1 = require("./constants");
const preprocessor_configuration_1 = require("./preprocessor-configuration");
const type_guards_1 = require("./type-guards");
const environment_helpers_1 = require("./environment-helpers");
const paths_1 = require("./helpers/paths");
const messages_helpers_1 = require("./messages-helpers");
function memoize(fn) {
    let result;
    return (...args) => {
        if (result) {
            return result;
        }
        return (result = fn(...args));
    };
}
const resolve = memoize(preprocessor_configuration_1.resolve);
let currentTestStepStartedId;
let currentSpecMessages;
async function beforeRunHandler(config) {
    const preprocessor = await resolve(config, config.env, "/");
    if (!preprocessor.messages.enabled) {
        return;
    }
    const messagesPath = (0, paths_1.ensureIsAbsolute)(config.projectRoot, preprocessor.messages.output);
    await fs_1.promises.rm(messagesPath, { force: true });
    const testRunStarted = {
        testRunStarted: {
            timestamp: (0, messages_helpers_1.createTimestamp)(),
        },
    };
    await fs_1.promises.mkdir(path_1.default.dirname(messagesPath), { recursive: true });
    await fs_1.promises.writeFile(messagesPath, JSON.stringify(testRunStarted) + "\n");
}
exports.beforeRunHandler = beforeRunHandler;
async function afterRunHandler(config) {
    const preprocessor = await resolve(config, config.env, "/");
    if (!preprocessor.messages.enabled &&
        !preprocessor.json.enabled &&
        !preprocessor.html.enabled) {
        return;
    }
    const messagesPath = (0, paths_1.ensureIsAbsolute)(config.projectRoot, preprocessor.messages.output);
    try {
        await fs_1.promises.access(messagesPath, fs_1.constants.F_OK);
    }
    catch (_a) {
        return;
    }
    if (preprocessor.messages.enabled) {
        const testRunFinished = {
            testRunFinished: {
                /**
                 * We're missing a "success" attribute here, but cucumber-js doesn't output it, so I won't.
                 * Mostly because I don't want to look into the semantics of it right now.
                 */
                timestamp: (0, messages_helpers_1.createTimestamp)(),
            },
        };
        await fs_1.promises.writeFile(messagesPath, JSON.stringify(testRunFinished) + "\n", {
            flag: "a",
        });
    }
    if (preprocessor.json.enabled) {
        const jsonPath = (0, paths_1.ensureIsAbsolute)(config.projectRoot, preprocessor.json.output);
        await fs_1.promises.mkdir(path_1.default.dirname(jsonPath), { recursive: true });
        const messages = await fs_1.promises.open(messagesPath, "r");
        try {
            const json = await fs_1.promises.open(jsonPath, "w");
            try {
                const { formatter, args } = preprocessor.json;
                const child = child_process_1.default.spawn(formatter, args, {
                    stdio: [messages.fd, json.fd, "inherit"],
                });
                await new Promise((resolve, reject) => {
                    child.on("exit", (code) => {
                        if (code === 0) {
                            resolve();
                        }
                        else {
                            reject(new Error(`${preprocessor.json.formatter} exited non-successfully`));
                        }
                    });
                    child.on("error", reject);
                });
            }
            finally {
                await json.close();
            }
        }
        finally {
            await messages.close();
        }
    }
    if (preprocessor.html.enabled) {
        const htmlPath = (0, paths_1.ensureIsAbsolute)(config.projectRoot, preprocessor.html.output);
        await fs_1.promises.mkdir(path_1.default.dirname(htmlPath), { recursive: true });
        const input = fs_1.default.createReadStream(messagesPath);
        const output = fs_1.default.createWriteStream(htmlPath);
        await new Promise((resolve, reject) => {
            stream_1.default.pipeline(input, new message_streams_1.NdjsonToMessageStream(), new html_formatter_1.default((0, resolve_pkg_1.default)("@cucumber/html-formatter", { cwd: __dirname }) +
                "/dist/main.css", (0, resolve_pkg_1.default)("@cucumber/html-formatter", { cwd: __dirname }) +
                "/dist/main.js"), output, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
exports.afterRunHandler = afterRunHandler;
async function beforeSpecHandler(_config) {
    currentSpecMessages = [];
}
exports.beforeSpecHandler = beforeSpecHandler;
async function afterSpecHandler(config, spec, results) {
    const preprocessor = await resolve(config, config.env, "/");
    const messagesPath = (0, paths_1.ensureIsAbsolute)(config.projectRoot, preprocessor.messages.output);
    // `results` is undefined when running via `cypress open`.
    if (!preprocessor.messages.enabled || !currentSpecMessages || !results) {
        return;
    }
    const wasRemainingSkipped = results.tests.some((test) => { var _a; return (_a = test.displayError) === null || _a === void 0 ? void 0 : _a.match(constants_1.HOOK_FAILURE_EXPR); });
    if (wasRemainingSkipped) {
        console.log(chalk_1.default.yellow(`  Hook failures can't be represented in JSON reports, thus none is created for ${spec.relative}.`));
    }
    else {
        await fs_1.promises.writeFile(messagesPath, currentSpecMessages.map((message) => JSON.stringify(message)).join("\n") +
            "\n", {
            flag: "a",
        });
    }
}
exports.afterSpecHandler = afterSpecHandler;
async function afterScreenshotHandler(config, details) {
    const preprocessor = await resolve(config, config.env, "/");
    if (!preprocessor.messages.enabled || !currentSpecMessages) {
        return details;
    }
    let buffer;
    try {
        buffer = await fs_1.promises.readFile(details.path);
    }
    catch (_a) {
        return details;
    }
    const message = {
        attachment: {
            testStepId: currentTestStepStartedId,
            body: buffer.toString("base64"),
            mediaType: "image/png",
            contentEncoding: "BASE64",
        },
    };
    currentSpecMessages.push(message);
    return details;
}
exports.afterScreenshotHandler = afterScreenshotHandler;
function mutateConfigObjectPreservingly(config, property, value) {
    var _a;
    const preserved = (_a = config[constants_1.INTERNAL_PROPERTY_NAME]) !== null && _a !== void 0 ? _a : (config[constants_1.INTERNAL_PROPERTY_NAME] = {});
    preserved[property] = config[property];
    config[property] = value;
}
exports.mutateConfigObjectPreservingly = mutateConfigObjectPreservingly;
function rebuildOriginalConfigObject(config) {
    return Object.assign({}, config, config[constants_1.INTERNAL_PROPERTY_NAME]);
}
exports.rebuildOriginalConfigObject = rebuildOriginalConfigObject;
async function addCucumberPreprocessorPlugin(on, config, options = {}) {
    config.env[constants_1.INTERNAL_SUITE_PROPERTIES] = { isEventHandlersAttached: true };
    const preprocessor = await resolve(config, config.env, "/");
    if (!options.omitBeforeRunHandler) {
        on("before:run", () => beforeRunHandler(config));
    }
    if (!options.omitAfterRunHandler) {
        on("after:run", () => afterRunHandler(config));
    }
    if (!options.omitBeforeSpecHandler) {
        on("before:spec", () => beforeSpecHandler(config));
    }
    if (!options.omitAfterSpecHandler) {
        on("after:spec", (spec, results) => afterSpecHandler(config, spec, results));
    }
    if (!options.omitAfterScreenshotHandler) {
        on("after:screenshot", (details) => afterScreenshotHandler(config, details));
    }
    on("task", {
        [constants_1.TASK_APPEND_MESSAGES]: (messages) => {
            if (!currentSpecMessages) {
                return true;
            }
            currentSpecMessages.push(...messages);
            return true;
        },
        [constants_1.TASK_TEST_STEP_STARTED]: (testStepStartedId) => {
            if (!currentSpecMessages) {
                return true;
            }
            currentTestStepStartedId = testStepStartedId;
            return true;
        },
        [constants_1.TASK_CREATE_STRING_ATTACHMENT]: ({ data, mediaType, encoding }) => {
            if (!currentSpecMessages) {
                return true;
            }
            const message = {
                attachment: {
                    testStepId: currentTestStepStartedId,
                    body: data,
                    mediaType: mediaType,
                    contentEncoding: encoding,
                },
            };
            currentSpecMessages.push(message);
            return true;
        },
    });
    const tags = (0, environment_helpers_1.getTags)(config.env);
    if (tags !== null && preprocessor.filterSpecs) {
        const node = (0, tag_expressions_1.default)(tags);
        const testFiles = (0, cypress_configuration_1.getTestFiles)(config).filter((testFile) => {
            const content = fs_1.default.readFileSync(testFile).toString("utf-8");
            const options = {
                includeSource: false,
                includeGherkinDocument: false,
                includePickles: true,
                newId: messages_1.IdGenerator.incrementing(),
            };
            const envelopes = (0, gherkin_1.generateMessages)(content, testFile, messages_1.SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN, options);
            const pickles = envelopes
                .map((envelope) => envelope.pickle)
                .filter(type_guards_1.notNull);
            return pickles.some((pickle) => { var _a, _b; return node.evaluate((_b = (_a = pickle.tags) === null || _a === void 0 ? void 0 : _a.map((tag) => tag.name).filter(type_guards_1.notNull)) !== null && _b !== void 0 ? _b : []); });
        });
        const propertyName = "specPattern" in config ? "specPattern" : "testFiles";
        /**
         * The preprocessor needs the original value at a later point in order to determine the implicit
         * integration folder correctly. Otherwise, scoping test files using tags would affect definition
         * resolvement and yield surprising results.
         */
        mutateConfigObjectPreservingly(config, propertyName, testFiles);
    }
    return config;
}
exports.default = addCucumberPreprocessorPlugin;