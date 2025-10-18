import * as path from "path";

/**
 * Resolves a file path within a working directory with security checks.
 *
 * Security features:
 * - Converts relative paths to absolute paths within working directory
 * - Prevents path traversal attacks (../ escaping)
 * - Rejects absolute paths outside the working directory
 *
 * @param filePath - The path to resolve (relative or absolute)
 * @param workingDirectory - The root working directory to resolve against
 * @returns Resolved absolute path within working directory
 * @throws Error if path attempts to escape working directory
 */
export function resolvePathInWorkingDir(
  filePath: string,
  workingDirectory: string
): string {
  // Normalize the working directory to an absolute path
  const normalizedWorkingDir = path.resolve(workingDirectory);

  // Resolve the file path against the working directory
  const resolvedPath = path.resolve(normalizedWorkingDir, filePath);

  // Check if the resolved path is within the working directory
  // This prevents path traversal attacks like ../../../etc/passwd
  if (!resolvedPath.startsWith(normalizedWorkingDir + path.sep) &&
      resolvedPath !== normalizedWorkingDir) {
    throw new Error(
      `Security violation: Path "${filePath}" resolves outside working directory. ` +
      `All file operations must be within: ${normalizedWorkingDir}`
    );
  }

  return resolvedPath;
}

/**
 * Validates that a path is within a working directory without resolving it.
 * Useful for quick checks before expensive operations.
 *
 * @param filePath - The path to validate
 * @param workingDirectory - The root working directory
 * @returns true if path is valid and within working directory
 */
export function isPathWithinWorkingDir(
  filePath: string,
  workingDirectory: string
): boolean {
  try {
    resolvePathInWorkingDir(filePath, workingDirectory);
    return true;
  } catch {
    return false;
  }
}
