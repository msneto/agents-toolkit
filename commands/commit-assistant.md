---
name: commit-assistant
description: AI-powered conventional commit message generator.
---
# Git Commit Assistant

## Goal
Generate a conventional commit message based on the staged changes and provided context.

## Instructions
1. Analyze the staged changes using `git diff --cached`.
2. Consider the user context: {{args}}.
3. Generate a message following the format: `<type>(<scope>): <description>`.

## Examples
- `feat(ui): add beautiful alignment to the dashboard`
- `fix(core): resolve variable resolution CI failure`
