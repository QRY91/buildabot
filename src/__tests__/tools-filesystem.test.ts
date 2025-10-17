import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { readFileTool, writeFileTool, listDirectoryTool } from '../tools/filesystem';

const TEST_DIR = path.join(__dirname, '../../test-temp');

describe('Filesystem Tools', () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('readFileTool', () => {
    it('should read file contents', async () => {
      const testFile = path.join(TEST_DIR, 'test.txt');
      await fs.writeFile(testFile, 'Hello, World!', 'utf-8');

      const result = await readFileTool.execute({ path: testFile });
      expect(result).toBe('Hello, World!');
    });

    it('should return error for non-existent file', async () => {
      const result = await readFileTool.execute({ path: path.join(TEST_DIR, 'nonexistent.txt') });
      expect(result).toContain('Error reading file');
      expect(result).toContain('ENOENT');
    });

    it('should have correct tool definition', () => {
      expect(readFileTool.definition.function.name).toBe('read_file');
      expect(readFileTool.definition.function.parameters.required).toContain('path');
    });
  });

  describe('writeFileTool', () => {
    it('should write content to file', async () => {
      const testFile = path.join(TEST_DIR, 'write-test.txt');

      const result = await writeFileTool.execute({
        path: testFile,
        content: 'Test content',
      });

      expect(result).toContain('Successfully wrote');

      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('Test content');
    });

    it('should overwrite existing file', async () => {
      const testFile = path.join(TEST_DIR, 'overwrite.txt');
      await fs.writeFile(testFile, 'Original', 'utf-8');

      await writeFileTool.execute({
        path: testFile,
        content: 'Updated',
      });

      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('Updated');
    });

    it('should return error for invalid path', async () => {
      const result = await writeFileTool.execute({
        path: '/invalid/path/that/does/not/exist/file.txt',
        content: 'test',
      });

      expect(result).toContain('Error writing file');
    });

    it('should have correct tool definition', () => {
      expect(writeFileTool.definition.function.name).toBe('write_file');
      expect(writeFileTool.definition.function.parameters.required).toContain('path');
      expect(writeFileTool.definition.function.parameters.required).toContain('content');
    });
  });

  describe('listDirectoryTool', () => {
    it('should list files and directories', async () => {
      // Create test structure
      await fs.writeFile(path.join(TEST_DIR, 'file1.txt'), 'content', 'utf-8');
      await fs.writeFile(path.join(TEST_DIR, 'file2.txt'), 'content', 'utf-8');
      await fs.mkdir(path.join(TEST_DIR, 'subdir'));

      const result = await listDirectoryTool.execute({ path: TEST_DIR });

      expect(result).toContain('[FILE] file1.txt');
      expect(result).toContain('[FILE] file2.txt');
      expect(result).toContain('[DIR] subdir');
    });

    it('should return error for non-existent directory', async () => {
      const result = await listDirectoryTool.execute({
        path: path.join(TEST_DIR, 'nonexistent')
      });

      expect(result).toContain('Error listing directory');
      expect(result).toContain('ENOENT');
    });

    it('should handle empty directory', async () => {
      const emptyDir = path.join(TEST_DIR, 'empty');
      await fs.mkdir(emptyDir);

      const result = await listDirectoryTool.execute({ path: emptyDir });
      expect(result).toBe('');
    });

    it('should have correct tool definition', () => {
      expect(listDirectoryTool.definition.function.name).toBe('list_directory');
      expect(listDirectoryTool.definition.function.parameters.required).toContain('path');
    });
  });
});
