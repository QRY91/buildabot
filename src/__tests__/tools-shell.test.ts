import { describe, it, expect } from 'vitest';
import { executeCommandTool } from '../tools/shell';

describe('Shell Tool (Sandboxed)', () => {
  describe('Safety Features', () => {
    it('should have correct tool definition', () => {
      expect(executeCommandTool.definition.function.name).toBe('execute_command');
      expect(executeCommandTool.definition.function.parameters.required).toContain('command');
    });

    it('should block dangerous commands - rm', async () => {
      const result = await executeCommandTool.execute({ command: 'rm -rf file.txt' });
      // rm is blocked at whitelist level (not in allowed commands)
      expect(result).toContain('Error');
      expect(result.toLowerCase()).toContain('rm');
    });

    it('should block dangerous commands - curl', async () => {
      const result = await executeCommandTool.execute({ command: 'curl https://example.com' });
      // curl is blocked at whitelist level (not in allowed commands)
      expect(result).toContain('Error');
      expect(result.toLowerCase()).toContain('curl');
    });

    it('should block command chaining with semicolon', async () => {
      const result = await executeCommandTool.execute({ command: 'cat file.txt; ls' });
      // Semicolon is in the dangerous patterns list
      expect(result).toContain('dangerous pattern');
      expect(result).toContain(';');
    });

    it('should block command chaining with pipes', async () => {
      const result = await executeCommandTool.execute({ command: 'cat file.txt | grep test' });
      expect(result).toContain('dangerous pattern');
      expect(result).toContain('|');
    });

    it('should block redirects', async () => {
      const result = await executeCommandTool.execute({ command: 'echo test > file.txt' });
      expect(result).toContain('dangerous pattern');
      expect(result).toContain('>');
    });

    it('should block command substitution', async () => {
      const result = await executeCommandTool.execute({ command: 'echo $(whoami)' });
      expect(result).toContain('dangerous pattern');
      expect(result).toContain('$(');
    });

    it('should block non-whitelisted commands', async () => {
      const result = await executeCommandTool.execute({ command: 'python script.py' });
      expect(result).toContain('not in the allowed list');
    });

    it('should return error for empty command', async () => {
      const result = await executeCommandTool.execute({ command: '' });
      expect(result).toBe('Error: No command provided');
    });
  });

  describe('Allowed Commands', () => {
    it('should allow ls command', async () => {
      const result = await executeCommandTool.execute({ command: 'ls' });
      // Should not contain error about being blocked
      expect(result).not.toContain('not in the allowed list');
      expect(result).not.toContain('dangerous pattern');
    });

    it('should allow pwd command', async () => {
      const result = await executeCommandTool.execute({ command: 'pwd' });
      expect(result).not.toContain('not in the allowed list');
      expect(result).toContain('sandbox'); // Should be in sandbox directory
    });

    it('should allow echo command', async () => {
      const result = await executeCommandTool.execute({ command: 'echo "test"' });
      expect(result).not.toContain('not in the allowed list');
      expect(result).toContain('test');
    });

    it('should allow whoami command', async () => {
      const result = await executeCommandTool.execute({ command: 'whoami' });
      expect(result).not.toContain('not in the allowed list');
    });

    it('should allow date command', async () => {
      const result = await executeCommandTool.execute({ command: 'date' });
      expect(result).not.toContain('not in the allowed list');
    });
  });

  describe('Execution Context', () => {
    it('should execute in sandbox directory', async () => {
      const result = await executeCommandTool.execute({ command: 'pwd' });
      expect(result).toContain('sandbox');
    });

    it('should be able to list sandbox contents', async () => {
      const result = await executeCommandTool.execute({ command: 'ls test-data' });
      // Should see test files without errors
      expect(result).not.toContain('Error');
    });

    it('should be able to read sandbox files', async () => {
      const result = await executeCommandTool.execute({ command: 'cat test-data/file1.txt' });
      expect(result).not.toContain('Error');
      expect(result).toContain('STDOUT');
    });
  });
});
