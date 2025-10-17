# Sandbox Directory

This directory is used for safely testing the shell command execution tool.

## Purpose

The shell tool (`execute_command`) is restricted to execute commands only within this sandbox directory. This prevents any accidental damage to your system while learning how agent tool execution works.

## Safety Measures

1. **Directory Restriction**: All commands execute with `cwd` set to this directory
2. **Command Whitelist**: Only safe commands are allowed (ls, cat, echo, grep, pwd, etc.)
3. **Blacklist**: Dangerous commands (rm, format, dd, etc.) are blocked
4. **Timeouts**: Commands are limited to 5 seconds execution time
5. **Feature Flag**: Shell tool must be explicitly enabled via `ENABLE_SHELL_TOOL=true`

## Test Files

Feel free to add test files here to experiment with the agent's file reading and command execution capabilities.
