// ---------- inline content data ----------
// posts: { title, date, slug, file } — file is a markdown path, opened on post.html?post=<slug>
const POSTS = [];

// projects: { title, date, url?, description }
const PROJECTS = [];

// playlists: { title, date, url, description }
const PLAYLISTS = [
  {
    title: "Python101",
    date: "6 videos",
    url: "https://www.youtube.com/playlist?list=PLhElUpxdC5wUOBx55cg5fWPwwFgAhZOXY",
    description:
      "Introduction to Python on the channel — core syntax, data types, and control flow, building up toward small working scripts.",
  },
  {
    title: "Linux101",
    date: "3 videos",
    url: "https://www.youtube.com/playlist?list=PLhElUpxdC5wV0Zl3TI5o2-e0oU_UAZ56-",
    description:
      "Linux essentials from the command line up — navigating the filesystem, files and permissions, and the everyday core tools.",
  },
];

// content catalog in content.json (regenerate with ./update-books.sh)
// books live in ./content/books, podcasts in ./content/podcasts;
// each entry: { id, file, title, size, description } — description points to a markdown file

// ---------- tiny markdown renderer ----------
// handles: # headings, paragraphs, - lists, ``` fences, `code`, **bold**, *em*, [links](url)
function mdToHtml(md) {
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function inline(s) {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return "\x00" + (codes.length - 1) + "\x00";
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/\x00(\d+)\x00/g, (_, i) => "<code>" + codes[+i] + "</code>");
    return s;
  }

  const lines = esc(md).split(/\r?\n/);
  const out = [];
  let code = null;
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) {
      out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push("<ul>" + list.map((li) => "<li>" + inline(li) + "</li>").join("") + "</ul>");
      list = null;
    }
  };
  const flushCode = () => {
    if (code) {
      out.push("<pre><code>" + code.join("\n") + "</code></pre>");
      code = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^```/.test(line)) {
      if (code) flushCode();
      else {
        flushPara();
        flushList();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flushPara();
      flushList();
      const lvl = h[1].length;
      out.push("<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">");
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.+)$/);
    if (li) {
      flushPara();
      (list ??= []).push(li[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  flushCode();
  return out.join("\n");
}

// ---------- item rendering ----------
// normalized item: { kind, title, tag, meta, description?, download?, url?, urlLabel?, slug? }
//   kind "file"  — expandable, description + download button (books, podcasts)
//   kind "link"  — expandable, description + external link button (projects, playlists)
//   kind "post"  — not expandable, head links to post.html?post=<slug>
const descCache = new Map();

async function loadDescription(item, el) {
  const desc = item.description;
  if (!desc) {
    el.innerHTML = "";
    return;
  }
  if (!desc.endsWith(".md")) {
    el.innerHTML = mdToHtml(desc);
    return;
  }
  try {
    let html;
    if (descCache.has(desc)) {
      html = descCache.get(desc);
    } else {
      const r = await fetch(desc, { cache: "no-cache" });
      if (!r.ok) throw new Error("http " + r.status);
      // drop the leading "# title" line — the title is already in the item head
      const md = (await r.text()).replace(/^#\s+.+\r?\n/, "");
      html = mdToHtml(md);
      descCache.set(desc, html);
    }
    el.innerHTML = html;
  } catch {
    el.innerHTML = '<p class="desc-error">// description unavailable</p>';
  }
}

function buildItem(item) {
  const li = document.createElement("li");
  li.className = "post-item";

  const title = document.createElement("h3");
  title.className = "post-title";
  title.textContent = item.title;

  const meta = document.createElement("p");
  meta.className = "post-meta";
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = "#" + item.tag;
  const date = document.createElement("span");
  date.className = "date";
  date.textContent = item.meta;
  meta.append(tag, date);

  if (item.kind === "post") {
    const a = document.createElement("a");
    a.className = "item-head";
    a.href = "post.html?post=" + encodeURIComponent(item.slug);
    a.append(title, meta);
    li.append(a);
    return li;
  }

  const head = document.createElement("button");
  head.className = "item-head";
  head.type = "button";
  head.setAttribute("aria-expanded", "false");

  const chev = document.createElement("span");
  chev.className = "chev";
  chev.textContent = "[+]";
  meta.append(chev);

  head.append(title, meta);

  const body = document.createElement("div");
  body.className = "item-body";
  body.hidden = true;

  head.addEventListener("click", () => {
    const open = li.classList.toggle("open");
    head.setAttribute("aria-expanded", String(open));
    body.hidden = !open;
    chev.textContent = open ? "[-]" : "[+]";
    if (open) loadDescription(item, body.querySelector(".item-desc"));
  });

  li.append(head, body);
  return li;
}

function renderList(items, listId) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  items.forEach((item) => {
    const li = buildItem(item);
    const body = li.querySelector(".item-body");

    if (body) {
      const desc = document.createElement("div");
      desc.className = "item-desc";
      body.append(desc);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      if (item.download) {
        const a = document.createElement("a");
        a.className = "btn btn-sm";
        a.href = item.download;
        a.download = "";
        a.textContent = item.downloadLabel ?? "download";
        actions.append(a);
      }
      if (item.url) {
        const a = document.createElement("a");
        a.className = "btn btn-sm";
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = item.urlLabel ?? "open";
        actions.append(a);
      }
      if (actions.childElementCount) body.append(actions);
    }

    listEl.append(li);
  });
}

// ---------- normalizers ----------
const normalizeFile = (base, tag, downloadLabel) => (b) => ({
  kind: "file",
  title: b.title,
  tag,
  meta: b.size,
  description: b.description,
  download: base + encodeURIComponent(b.file),
  downloadLabel,
});

const normalizeLink = (tag, urlLabel) => (x) => ({
  kind: "link",
  title: x.title,
  tag,
  meta: x.date,
  url: x.url,
  urlLabel,
  description: x.description,
});

const normalizePost = (p) => ({
  kind: "post",
  title: p.title,
  tag: "post",
  meta: p.date,
  slug: p.slug,
});

fetch("content.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then(({ books = [], podcasts = [] }) => {
    renderList(books.map(normalizeFile("content/books/", "pdf", "download")), "book-list");
    renderList(podcasts.map(normalizeFile("content/podcasts/", "podcast", "download")), "podcast-list");
  })
  .catch(() => {
    const status = document.getElementById("book-status");
    if (status) status.textContent = "error: content.json not found";
  });

renderList(POSTS.map(normalizePost), "post-list");
renderList(PROJECTS.map(normalizeLink("project", "visit")), "project-list");
renderList(PLAYLISTS.map(normalizeLink("playlist", "watch on youtube")), "playlist-list");

// ---------- full post page (post.html) ----------
function renderFullPost() {
  const el = document.getElementById("post-body");
  if (!el) return;

  const slugEl = document.getElementById("post-slug");
  const slug = new URLSearchParams(location.search).get("post");
  const post = POSTS.find((p) => p.slug === slug);

  if (!post) {
    if (slugEl) slugEl.textContent = slug ?? "?";
    el.innerHTML = '<p class="desc-error">// post not found</p>';
    el.hidden = false;
    return;
  }

  if (slugEl) slugEl.textContent = post.file.replace(/^.*\//, "");
  document.title = post.title + " — Channel1337";

  fetch(post.file, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("http " + r.status);
      return r.text();
    })
    .then((md) => {
      el.innerHTML = mdToHtml(md);
      el.hidden = false;
    })
    .catch(() => {
      el.innerHTML = '<p class="desc-error">// error loading post</p>';
      el.hidden = false;
    });
}

renderFullPost();

// ---------- typing effect ----------
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
