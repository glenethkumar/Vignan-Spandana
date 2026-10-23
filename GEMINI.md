# Workspace Rules: Vignan Spandana

## Automatic Deployment Workflow
- After completing any code modifications, fixes, or feature implementations in any response turn:
  1. Verify changes with tests (ensure 100% test pass rate).
  2. Stage all modified and created files: `git add <files>`.
  3. Commit with a clear, descriptive message: `git commit -m "..."`.
  4. Automatically push to the remote repository: `git push origin main`.
- Pushing to `origin main` automatically triggers live deployment on Render / connected cloud hosting.
