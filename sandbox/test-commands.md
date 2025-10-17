# Test Commands for Sandbox

Use these commands to test the shell tool safely:

## Safe Commands (Should Work)

```bash
ls                          # List files in sandbox
ls -la test-data           # List with details
pwd                        # Show current directory
cat test-data/file1.txt    # Read a file
grep "test" test-data/*.txt # Search for text
find test-data -name "*.txt" # Find files
wc -l test-data/file1.txt  # Count lines
head test-data/file2.txt   # Show first lines
tail test-data/file2.txt   # Show last lines
```

## Blocked Commands (Should Be Rejected)

```bash
rm test-data/file1.txt     # Delete file (BLOCKED)
curl https://example.com   # Network access (BLOCKED)
ls && cat file1.txt        # Command chaining (BLOCKED)
echo "test" > file.txt     # Redirect (BLOCKED)
cat file1.txt | grep test  # Pipe (BLOCKED)
```

## Testing Tool Calls

Ask the agent to:
- "List the files in the sandbox"
- "Read the contents of test-data/file1.txt"
- "Search for 'agent' in all text files"
- "Try to delete a file" (should be blocked)
