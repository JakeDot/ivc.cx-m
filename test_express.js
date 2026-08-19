const express = require('express');
const app = express();
app.get(/^\/\+$/, (req, res) => {
  res.json({ success: true });
});
app.listen(3001, () => {
  console.log("Started");
});
