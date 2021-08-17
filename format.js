const fs = require("fs");

const data = JSON.parse(fs.readFileSync("./spam.json"));
console.log(data.map(comment => comment.id).join(","))