"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Test setup file
const globals_1 = require("@jest/globals");
// Mock fetch globally
global.fetch = globals_1.jest.fn();
// Mock the MCP SDK Server class
globals_1.jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: globals_1.jest.fn().mockImplementation(() => ({
        setRequestHandler: globals_1.jest.fn(),
        connect: globals_1.jest.fn(),
    })),
}));
// Mock the StdioServerTransport
globals_1.jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
    StdioServerTransport: globals_1.jest.fn(),
}));
// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    // Keep error and warn for debugging
    log: globals_1.jest.fn(),
    info: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
};
//# sourceMappingURL=setup.js.map