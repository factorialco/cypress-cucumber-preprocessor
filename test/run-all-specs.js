"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const child_process_1 = __importDefault(require("child_process"));
const assertions_1 = require("../lib/assertions");
function aggregatedTitle(test) {
    var _a;
    if ((_a = test.parent) === null || _a === void 0 ? void 0 : _a.title) {
        return `${aggregatedTitle(test.parent)} - ${test.title}`;
    }
    else {
        return test.title;
    }
}
async function writeFile(filePath, fileContent) {
    await fs_1.promises.mkdir(path_1.default.dirname(filePath), { recursive: true });
    await fs_1.promises.writeFile(filePath, fileContent);
}
const projectPath = path_1.default.join(__dirname, "..");
describe("Run all specs", () => {
    beforeEach(async function () {
        var _a, _b;
        const title = aggregatedTitle((0, assertions_1.assertAndReturn)((_b = (_a = this.test) === null || _a === void 0 ? void 0 : _a.ctx) === null || _b === void 0 ? void 0 : _b.currentTest, "Expected hook to have a context and a test"));
        this.tmpDir = path_1.default.join(projectPath, "tmp", title.replace(/[()?]/g, ""));
        await fs_1.promises.rm(this.tmpDir, { recursive: true, force: true });
        await writeFile(path_1.default.join(this.tmpDir, "cypress.json"), JSON.stringify({
            testFiles: "**/*.feature",
            video: false,
        }));
        await writeFile(path_1.default.join(this.tmpDir, "cypress", "plugins", "index.js"), `
        const { createEsbuildPlugin } = require("@badeball/cypress-cucumber-preprocessor/esbuild");
        const createBundler = require("@bahmutov/cypress-esbuild-preprocessor");

        module.exports = (on, config) => {
          on(
            "file:preprocessor",
            createBundler({
              plugins: [createEsbuildPlugin(config)]
            })
          );
        }
      `);
        await fs_1.promises.mkdir(path_1.default.join(this.tmpDir, "node_modules", "@badeball"), {
            recursive: true,
        });
        await fs_1.promises.symlink(projectPath, path_1.default.join(this.tmpDir, "node_modules", "@badeball", "cypress-cucumber-preprocessor"));
    });
    it("should work fine with seemingly (?) ambiguous step definitions", async function () {
        const feature = `
      Feature:
        Scenario:
          Given a step
    `;
        const steps = `
      const { Given } = require("@badeball/cypress-cucumber-preprocessor");
      Given("a step", function() {});
    `;
        await writeFile(path_1.default.join(this.tmpDir, "cypress", "integration", "a.feature"), feature);
        await writeFile(path_1.default.join(this.tmpDir, "cypress", "integration", "a.ts"), steps);
        await writeFile(path_1.default.join(this.tmpDir, "cypress", "integration", "b.feature"), feature);
        await writeFile(path_1.default.join(this.tmpDir, "cypress", "integration", "b.ts"), steps);
        child_process_1.default.spawnSync(path_1.default.join(projectPath, "node_modules", ".bin", "cypress"), ["open"], { cwd: this.tmpDir, stdio: "inherit" });
    });
});
