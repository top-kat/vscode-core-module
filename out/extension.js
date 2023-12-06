'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const generate_1 = __importDefault(require("./generate"));
const highlight_1 = __importDefault(require("./highlight"));
const generate_synopsis_header_for_test_flows_1 = __importDefault(require("./generate-synopsis-header-for-test-flows"));
function activate(ctx) {
    console.log(`GEN`);
    (0, generate_1.default)();
    (0, highlight_1.default)(ctx);
    (0, generate_synopsis_header_for_test_flows_1.default)(ctx);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map