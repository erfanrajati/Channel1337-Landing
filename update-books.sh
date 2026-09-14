#!/usr/bin/env bash
# Regenerates books.json from the PDFs in ./content — run after adding/removing books.
set -euo pipefail
cd "$(dirname "$0")"

node -e '
const fs = require("fs");
const files = fs.readdirSync("content").filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
const books = files.map((f) => {
  const size = fs.statSync("content/" + f).size;
  const title = f.replace(/\.pdf$/i, "").replace(/_/g, " ").trim();
  return {
    file: f,
    title,
    size: (size / 1024 / 1024).toFixed(1) + " MB",
  };
});
fs.writeFileSync("books.json", JSON.stringify(books, null, 2) + "\n");
console.log("wrote books.json with", books.length, "books");
'
