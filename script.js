const POSTS = [];

const PROJECTS = [];

const PODCASTS = [];

const BOOKS = [];

// baked-in from youtube.com/@channel1337net/playlists on 2026-09-14
const PLAYLISTS = [
  {
    title: "Python101",
    date: "6 videos",
    tag: "playlist",
    url: "https://www.youtube.com/playlist?list=PLhElUpxdC5wUOBx55cg5fWPwwFgAhZOXY",
  },
  {
    title: "Linux101",
    date: "3 videos",
    tag: "playlist",
    url: "https://www.youtube.com/playlist?list=PLhElUpxdC5wV0Zl3TI5o2-e0oU_UAZ56-",
  },
];

// books served from ./content, manifest in books.json (regenerate with ./update-books.sh)
fetch("books.json")
  .then((r) => r.json())
  .then((books) => {
    const bookList = document.getElementById("book-list");
    if (!bookList) return;

    books.forEach((book) => {
      const li = document.createElement("li");
      li.className = "post-item";

      const a = document.createElement("a");
      a.className = "post-link";
      a.href = "content/" + encodeURIComponent(book.file);
      a.download = book.file;

      const title = document.createElement("h3");
      title.className = "post-title";
      title.textContent = book.title;

      const meta = document.createElement("p");
      meta.className = "post-meta";

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "#pdf";

      const size = document.createElement("span");
      size.className = "date";
      size.textContent = book.size;

      meta.append(tag, size);
      a.append(title, meta);
      li.append(a);
      bookList.append(li);
    });
  })
  .catch(() => {
    const status = document.getElementById("book-status");
    if (status) status.textContent = "error: books.json not found";
  });

function renderList(items, listId) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  items.forEach((post) => {
    const li = document.createElement("li");
    li.className = "post-item";

    const a = document.createElement("a");
    a.className = "post-link";
    a.href = post.url;

    const title = document.createElement("h3");
    title.className = "post-title";
    title.textContent = post.title;

    const meta = document.createElement("p");
    meta.className = "post-meta";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `#${post.tag}`;

    const date = document.createElement("time");
    date.className = "date";
    date.dateTime = post.date;
    date.textContent = post.date;

    meta.append(tag, date);
    a.append(title, meta);
    li.append(a);
    listEl.append(li);
  });
}

renderList(POSTS, "post-list");
renderList(PROJECTS, "project-list");
renderList(PODCASTS, "podcast-list");
renderList(PLAYLISTS, "playlist-list");

// typing effect
const PROMPTS = ["whoami", "cat ./welcome.txt", "start --blog"];
const typedEl = document.getElementById("typed");

let p = 0;
let i = 0;
let deleting = false;

function type() {
  const current = PROMPTS[p];

  if (!deleting) {
    typedEl.textContent = current.slice(0, ++i);
    if (i === current.length) {
      deleting = true;
      return setTimeout(type, 1800);
    }
  } else {
    typedEl.textContent = current.slice(0, --i);
    if (i === 0) {
      deleting = false;
      p = (p + 1) % PROMPTS.length;
    }
  }

  setTimeout(type, deleting ? 40 : 80);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  type();
} else {
  typedEl.textContent = "start --blog";
}
