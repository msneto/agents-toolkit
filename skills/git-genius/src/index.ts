const input = await Bun.stdin.json();
console.log(
	JSON.stringify({ status: "Repo is healthy", path: input.path || "./" }),
);
