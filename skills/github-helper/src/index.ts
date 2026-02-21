/**
 * Logic for github-helper skill.
 * Input is received via STDIN as JSON.
 */

const input = await Bun.stdin.json();
console.log(JSON.stringify({ result: "Hello from github-helper!", input }));
