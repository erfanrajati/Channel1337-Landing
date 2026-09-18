#!/usr/bin/env bash
# Regenerates content.json from the files in ./content/books and ./content/podcasts.
# Keeps each entry's id (and thus its description path) stable across runs.
# Book titles are derived from the pdf filename; podcast titles/descriptions are
# kept from existing entries (edit them in content.json, they survive reruns).
# Descriptions live in content/{books,podcasts}/descriptions/<id>.md — write one per new item.
set -euo pipefail
cd "$(dirname "$0")"

node -e '
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB = "content.json";
const db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, "utf8")) : { books: [], podcasts: [] };

function scan(dir, entries, exts, entryFor) {
  const prev = new Map(entries.map((e) => [e.file, e]));
  return fs
    .readdirSync(dir)
    .filter((f) => exts.includes(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => entryFor(f, prev.get(f), fs.statSync(dir + "/" + f).size, crypto.randomUUID()));
}

const books = scan("content/books", db.books, [".pdf"], (f, prev, size, id) => ({
  id: prev?.id ?? id,
  file: f,
  title: f.replace(/\.pdf$/i, "").replace(/_/g, " ").trim(),
  size: (size / 1024 / 1024).toFixed(1) + " MB",
  description: prev?.description ?? "content/books/descriptions/" + (prev?.id ?? id) + ".md",
}));

const podcasts = scan("content/podcasts", db.podcasts ?? [], [".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"], (f, prev, size, id) => ({
  id: prev?.id ?? id,
  file: f,
  title: prev?.title ?? f.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(),
  size: (size / 1024 / 1024).toFixed(1) + " MB",
  description: prev?.description ?? "content/podcasts/descriptions/" + (prev?.id ?? id) + ".md",
}));

fs.writeFileSync(DB, JSON.stringify({ books, podcasts }, null, 2) + "\n");
console.log("wrote content.json with", books.length, "books and", podcasts.length, "podcasts");
'
