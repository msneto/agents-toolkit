/**
 * Logic for test-standard-skill skill.
 * Input is received via STDIN as JSON.
 */

const input = await Bun.stdin.json();
console.log(
	JSON.stringify({ result: "Hello from test-standard-skill!", input }),
);
