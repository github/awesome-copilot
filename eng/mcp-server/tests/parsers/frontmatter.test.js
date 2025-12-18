"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const frontmatter_1 = require("../../src/parsers/frontmatter");
describe('Frontmatter Parser', () => {
    describe('parseFrontmatter', () => {
        it('should parse valid frontmatter', () => {
            const content = `---
description: 'Test description'
model: GPT-4
name: 'test-agent'
---

This is the body content.`;
            const result = (0, frontmatter_1.parseFrontmatter)(content);
            expect(result.frontmatter).toEqual({
                description: 'Test description',
                model: 'GPT-4',
                name: 'test-agent',
            });
            expect(result.body).toBe('\nThis is the body content.');
        });
        it('should handle empty frontmatter', () => {
            const content = `---
---

Body content only.`;
            const result = (0, frontmatter_1.parseFrontmatter)(content);
            expect(result.frontmatter).toEqual({});
            expect(result.body).toBe('\nBody content only.');
        });
        it('should handle content without frontmatter', () => {
            const content = 'Just body content without frontmatter.';
            const result = (0, frontmatter_1.parseFrontmatter)(content);
            expect(result.frontmatter).toBeUndefined();
            expect(result.body).toBe('Just body content without frontmatter.');
        });
        it('should handle malformed YAML gracefully', () => {
            const content = `---
description: Test
invalid: yaml: content:
---

Body content.`;
            const result = (0, frontmatter_1.parseFrontmatter)(content);
            // Should parse what it can
            expect(result.frontmatter).toEqual({
                description: 'Test',
                invalid: 'yaml: content:',
            });
            expect(result.body).toBe('\nBody content.');
        });
        it('should handle frontmatter with special characters', () => {
            const content = `---
description: "Description with 'quotes' and "double quotes""
model: GPT-4.1
---

Content with special chars: @#$%^&*()`;
            const result = (0, frontmatter_1.parseFrontmatter)(content);
            expect(result.frontmatter).toBeDefined();
            expect(result.frontmatter.description).toBe("Description with 'quotes' and \"double quotes\"");
            expect(result.frontmatter.model).toBe('GPT-4.1');
            expect(result.body).toBe('\nContent with special chars: @#$%^&*()');
        });
        it('should handle multiline content', () => {
            const content = `---
description: Multi-line description
---

Line 1
Line 2

Line 4`;
            const result = (0, frontmatter_1.parseFrontmatter)(content);
            expect(result.frontmatter).toBeDefined();
            expect(result.frontmatter.description).toBe('Multi-line description');
            expect(result.body).toBe('\nLine 1\nLine 2\n\nLine 4');
        });
        it('should handle empty content', () => {
            const result = (0, frontmatter_1.parseFrontmatter)('');
            expect(result.frontmatter).toBeUndefined();
            expect(result.body).toBe('');
        });
        it('should handle content with only frontmatter delimiters', () => {
            const content = `---
---
No body content.`;
            const result = (0, frontmatter_1.parseFrontmatter)(content);
            expect(result.frontmatter).toEqual({});
            expect(result.body).toBe('No body content.');
        });
    });
});
//# sourceMappingURL=frontmatter.test.js.map