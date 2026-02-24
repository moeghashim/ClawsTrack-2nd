const { runIngestion } = require('./services/ingestService');

(async () => {
  try {
    const run = await runIngestion();
    console.log(JSON.stringify(run, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
})();
