process.env.LOCAL_DB = "true";
const { startServer } = require("./server");

startServer().catch((error) => {
  console.error("Failed to start local POS server", error);
  process.exit(1);
});
