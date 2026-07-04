const [major] = process.versions.node.split('.').map(Number);

if (major !== 22) {
  console.error(
    `Promethean requires Node.js 22 locally. Current runtime: ${process.version}. Run \`nvm use\` or switch your shell to Node 22 and try again.`
  );
  process.exit(1);
}
