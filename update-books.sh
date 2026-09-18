#!/usr/bin/env bash
# Regenerates content.json from the files in ./content/books — run after adding/removing books.
# Keeps each entry's id (and thus its description path) stable across runs.
# Descriptions live in content/books/descriptions/<id>.md — write one for each new book.
set -euo pipefail
cd "$(dirname "$0")"

node -e '
const fs = require("fs");
const crypto = require("crypto");

const DB = "content.json";
const db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, "utf8")) : { books: [], podcasts: [] };
const byFile = new Map(db.books.map((b) => [b.file, b]));

const files = fs.readdirSync("content/books").filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
const books = files.map((f) => {
  const prev = byFile.get(f);
  const size = fs.statSync("content/books/" + f).size;
  const title = f.replace(/\.pdf$/i, "").replace(/_/g, " ").trim();
  const id = prev?.id ?? crypto.randomUUID();
  return {
    id,
    file: f,
    title,
    size: (size / 1024 / 1024).toFixed(1) + " MB",
    description: prev?.description ?? "content/books/descriptions/" + id + ".md",
  };
});

fs.writeFileSync(DB, JSON.stringify({ books, podcasts: db.podcasts ?? [] }, null, 2) + "\n");
console.log("wrote content.json with", books.length, "books and", (db.podcasts ?? []).length, "podcasts");
'
