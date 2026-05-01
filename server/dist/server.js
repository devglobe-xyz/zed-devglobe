"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../devglobe-core/src/config.ts
var fs2 = __toESM(require("node:fs"), 1);
var path2 = __toESM(require("node:path"), 1);
var os = __toESM(require("node:os"), 1);

// ../../devglobe-core/src/logger.ts
var fs = __toESM(require("node:fs"), 1);
var path = __toESM(require("node:path"), 1);
var LOG_FILE_NAME = "devglobe.log";
var MAX_LOG_BYTES = 5 * 1024 * 1024;
var TRUNCATE_KEEP_BYTES = 1 * 1024 * 1024;
var Logger = class {
  level = 0 /* Error */;
  editor = "";
  /**
   * Enabled when the config has `debug = true` in `~/.devglobe/config.toml`.
   * The editor tag is shown on every line so logs from multiple plugins
   * sharing the same file stay readable.
   */
  configure(debugFromConfig, editor) {
    this.level = debugFromConfig ? 2 /* Debug */ : 0 /* Error */;
    if (editor) this.editor = editor;
  }
  setEditor(editor) {
    this.editor = editor;
  }
  isEnabled() {
    return this.level >= 2 /* Debug */;
  }
  error(...args) {
    this.write("ERROR", args);
  }
  info(...args) {
    if (this.level >= 1 /* Info */) this.write("INFO", args);
  }
  debug(...args) {
    if (this.level >= 2 /* Debug */) this.write("DEBUG", args);
  }
  write(level, args) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const message = args.map(this.format).join(" ");
    const tag = this.editor ? `[${this.editor}]` : "";
    const line = `${timestamp} ${level} ${tag} ${message}
`.replace(/  +/g, " ");
    try {
      const filePath = this.logPath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(filePath, line, { mode: 384 });
      this.maybeRotate(filePath);
    } catch {
    }
  }
  maybeRotate(filePath) {
    try {
      const stat2 = fs.statSync(filePath);
      if (stat2.size <= MAX_LOG_BYTES) return;
      const fd = fs.openSync(filePath, "r");
      const buf = Buffer.alloc(TRUNCATE_KEEP_BYTES);
      fs.readSync(fd, buf, 0, TRUNCATE_KEEP_BYTES, stat2.size - TRUNCATE_KEEP_BYTES);
      fs.closeSync(fd);
      fs.writeFileSync(filePath, buf, { mode: 384 });
    } catch {
    }
  }
  logPath() {
    return path.join(devglobeDir(), LOG_FILE_NAME);
  }
  format(arg) {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
};
var logger = new Logger();

// ../../devglobe-core/src/config.ts
function defaultConfig() {
  return {
    apiKey: null,
    debug: false,
    privacy: { hideFileNames: false, hideBranchNames: false, hideProjectNames: false }
  };
}
function devglobeDir() {
  return path2.join(os.homedir(), ".devglobe");
}
function configPath() {
  return path2.join(devglobeDir(), "config.toml");
}
function legacyApiKeyPath() {
  return path2.join(devglobeDir(), "api_key");
}
function loadConfig() {
  const cfgPath = configPath();
  let cfg;
  if (!fs2.existsSync(cfgPath)) {
    cfg = migrateLegacyKey();
  } else {
    try {
      cfg = parseToml(fs2.readFileSync(cfgPath, "utf-8"));
    } catch {
      cfg = defaultConfig();
    }
  }
  logger.configure(cfg.debug);
  return cfg;
}
function saveConfig(cfg) {
  const dir = devglobeDir();
  if (!fs2.existsSync(dir)) fs2.mkdirSync(dir, { recursive: true });
  fs2.writeFileSync(configPath(), stringifyToml(cfg), { mode: 384 });
}
function setApiKey(apiKey) {
  const cfg = loadConfig();
  cfg.apiKey = apiKey;
  saveConfig(cfg);
  logger.info("api key saved to config.toml");
}
function migrateLegacyKey() {
  const legacyPath = legacyApiKeyPath();
  if (!fs2.existsSync(legacyPath)) return defaultConfig();
  try {
    const key = fs2.readFileSync(legacyPath, "utf-8").trim();
    const cfg = defaultConfig();
    cfg.apiKey = key || null;
    saveConfig(cfg);
    logger.info("migrated legacy ~/.devglobe/api_key to config.toml");
    return cfg;
  } catch (err) {
    logger.error("failed to migrate legacy api_key", err);
    return defaultConfig();
  }
}
function parseTomlValue(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  return raw;
}
function parseToml(content) {
  const cfg = defaultConfig();
  let section = "";
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      section = line.slice(1, -1).trim();
      continue;
    }
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = parseTomlValue(line.slice(eqIdx + 1).trim());
    if (section === "" && key === "api_key" && typeof value === "string") {
      cfg.apiKey = value || null;
    } else if (section === "" && key === "debug" && typeof value === "boolean") {
      cfg.debug = value;
    } else if (section === "privacy" && typeof value === "boolean") {
      if (key === "hide_file_names") cfg.privacy.hideFileNames = value;
      else if (key === "hide_branch_names") cfg.privacy.hideBranchNames = value;
      else if (key === "hide_project_names") cfg.privacy.hideProjectNames = value;
    }
  }
  return cfg;
}
function stringifyToml(cfg) {
  const lines = [];
  if (cfg.apiKey) lines.push(`api_key = "${cfg.apiKey}"`);
  if (cfg.debug) lines.push(`debug = true`);
  lines.push("");
  lines.push("[privacy]");
  lines.push(`hide_file_names = ${cfg.privacy.hideFileNames}`);
  lines.push(`hide_branch_names = ${cfg.privacy.hideBranchNames}`);
  lines.push(`hide_project_names = ${cfg.privacy.hideProjectNames}`);
  return lines.join("\n") + "\n";
}

// ../../devglobe-core/src/git.ts
var fsp = __toESM(require("node:fs/promises"), 1);
var path3 = __toESM(require("node:path"), 1);

// ../../devglobe-core/src/constants.ts
var API_BASE_URL = "https://devglobe.xyz";
var HEARTBEAT_ENDPOINT = `${API_BASE_URL}/api/v2/heartbeat`;
var STATUS_ENDPOINT = `${API_BASE_URL}/api/v2/status`;
var KEEPALIVE_INTERVAL_MS = 3e4;
var DEDUP_WINDOW_MS = 2e3;
var ACTIVITY_TIMEOUT_MS = 6e4;
var FETCH_TIMEOUT_MS = 15e3;
var GIT_CACHE_TTL_MS = 3e5;
var OFFLINE_THRESHOLD = 2;
function currentPlatform() {
  switch (process.platform) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    default:
      return "Linux";
  }
}

// ../../devglobe-core/src/git.ts
var MAX_WALK_UP = 30;
var MAX_CACHE_ENTRIES = 32;
var NO_GIT = { repo: null, branch: null, root: null };
var cache = /* @__PURE__ */ new Map();
async function detectGit(cwd) {
  const now = Date.now();
  const hit = cache.get(cwd);
  if (hit && now - hit.fetchedAt < GIT_CACHE_TTL_MS) {
    return { repo: hit.repo, branch: hit.branch, root: hit.root };
  }
  const realCwd = await safeRealpath(cwd);
  const info = await findGit(realCwd);
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(cwd, { ...info, fetchedAt: now });
  return info;
}
async function safeRealpath(p) {
  try {
    return await fsp.realpath(p);
  } catch {
    return p;
  }
}
async function findGit(start) {
  let dir = start;
  for (let i = 0; i < MAX_WALK_UP; i++) {
    const gitDir = await resolveGitDir(dir);
    if (gitDir === "not-a-repo") {
      return { repo: null, branch: null, root: dir };
    }
    if (gitDir) {
      const [branch, repo] = await Promise.all([readBranch(gitDir), readRepo(gitDir)]);
      return { repo, branch, root: dir };
    }
    const parent = path3.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return NO_GIT;
}
async function resolveGitDir(dir) {
  const gitPath = path3.join(dir, ".git");
  const stat2 = await fsp.stat(gitPath).catch(() => null);
  if (!stat2) return null;
  if (stat2.isDirectory()) return gitPath;
  if (!stat2.isFile()) return "not-a-repo";
  const content = await fsp.readFile(gitPath, "utf8").catch(() => "");
  const match = content.match(/^gitdir:\s*(.+)$/m);
  if (!match) return "not-a-repo";
  const target = match[1].trim();
  return path3.isAbsolute(target) ? target : path3.resolve(dir, target);
}
async function readBranch(gitDir) {
  try {
    const head = (await fsp.readFile(path3.join(gitDir, "HEAD"), "utf8")).trim();
    const refMatch = head.match(/^ref:\s*refs\/heads\/(.+)$/);
    return refMatch ? refMatch[1] : null;
  } catch {
    return null;
  }
}
async function readRepo(gitDir) {
  try {
    const configPath2 = await resolveConfigPath(gitDir);
    const content = await fsp.readFile(configPath2, "utf8");
    return parseOriginUrl(content);
  } catch {
    return null;
  }
}
async function resolveConfigPath(gitDir) {
  try {
    const commondir = (await fsp.readFile(path3.join(gitDir, "commondir"), "utf8")).trim();
    const resolved = path3.isAbsolute(commondir) ? commondir : path3.resolve(gitDir, commondir);
    const altConfig = path3.join(resolved, "config");
    await fsp.access(altConfig);
    return altConfig;
  } catch {
    return path3.join(gitDir, "config");
  }
}
function parseOriginUrl(config) {
  const lines = config.split("\n");
  let inOrigin = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inOrigin = /^\[remote\s+"origin"\]$/.test(trimmed);
      continue;
    }
    if (!inOrigin) continue;
    const match = trimmed.match(/^url\s*=\s*(.+)$/);
    if (match) {
      return canonicalizeRepoUrl(match[1].trim());
    }
  }
  return null;
}
function canonicalizeRepoUrl(raw) {
  if (!raw) return null;
  const stripped = raw.replace(/\.git$/, "");
  const ssh = stripped.match(/^[\w.-]+@([^:]+):(.+)$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  const sshUrl = stripped.match(/^ssh:\/\/[\w.-]+@([^/:]+)(?::\d+)?\/(.+)$/);
  if (sshUrl) return `https://${sshUrl[1]}/${sshUrl[2]}`;
  if (/^https?:\/\//.test(stripped)) return stripped;
  const gitProto = stripped.match(/^git:\/\/([^/]+)\/(.+)$/);
  if (gitProto) return `https://${gitProto[1]}/${gitProto[2]}`;
  return null;
}
function relativeToRoot(filePath, repoRoot) {
  const rel = path3.relative(repoRoot, filePath);
  return rel.startsWith("..") ? filePath : rel;
}
async function resolveRepoFields(filePath, privacy, cwd = path3.dirname(filePath)) {
  const git = await detectGit(cwd);
  const fields = {};
  if (!privacy.hideProjectNames && git.repo) fields.repo = git.repo;
  if (!privacy.hideProjectNames && !privacy.hideBranchNames && git.branch) {
    fields.branch = git.branch;
  }
  if (!privacy.hideFileNames && git.root) {
    fields.file = relativeToRoot(filePath, git.root);
  }
  return fields;
}

// ../../devglobe-core/src/heartbeat.ts
var InvalidApiKeyError = class extends Error {
  code = "INVALID_API_KEY";
  constructor() {
    super("Invalid API key");
    this.name = "InvalidApiKeyError";
  }
};
async function sendBatch(apiKey, batch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const started = Date.now();
  try {
    logger.debug("heartbeat send", {
      events: batch.heartbeats.length,
      editor: batch.editor,
      first: batch.heartbeats[0]
    });
    const res = await fetch(HEARTBEAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(batch),
      signal: controller.signal
    });
    if (res.status === 401) {
      logger.error(`heartbeat rejected: invalid api key (${Date.now() - started}ms)`);
      throw new InvalidApiKeyError();
    }
    if (!res.ok) {
      logger.error(`heartbeat HTTP ${res.status} (${Date.now() - started}ms)`);
      throw new Error(`HTTP ${res.status}`);
    }
    const body = await res.json();
    logger.debug(`heartbeat ok (${Date.now() - started}ms)`, body);
    return body;
  } catch (err) {
    if (err instanceof InvalidApiKeyError) throw err;
    if (!(err instanceof Error && err.message.startsWith("HTTP "))) {
      logger.error("heartbeat error", err);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
async function sendStatus(apiKey, message) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const truncated = message.slice(0, 100);
    logger.debug("status send", { length: truncated.length });
    const res = await fetch(STATUS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({ message: truncated }),
      signal: controller.signal
    });
    if (res.status === 401) {
      logger.error("status rejected: invalid api key");
      throw new InvalidApiKeyError();
    }
    if (!res.ok) {
      logger.error(`status HTTP ${res.status}`);
      throw new Error(`HTTP ${res.status}`);
    }
    logger.debug("status ok");
  } catch (err) {
    if (err instanceof InvalidApiKeyError) throw err;
    if (!(err instanceof Error && err.message.startsWith("HTTP "))) {
      logger.error("status error", err);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ../../devglobe-core/src/tracker.ts
var Tracker = class {
  constructor(emit) {
    this.emit = emit;
  }
  pluginVersion = "";
  editor = "";
  currentFile;
  // Raw absolute path last seen on the input side, used for change detection.
  // `currentFile` is rewritten relative to the git root and would never match
  // the absolute path coming back in from the editor.
  lastFileInput;
  currentLanguage;
  currentRepo;
  currentBranch;
  lastActivity = 0;
  pending = [];
  lastDedup = { file: void 0, language: void 0, at: 0 };
  timer = null;
  paused = false;
  offline = false;
  consecutiveErrors = 0;
  todaySeconds = 0;
  init(pluginVersion, editor) {
    this.pluginVersion = pluginVersion;
    this.editor = editor;
    logger.setEditor(editor);
    const cfg = loadConfig();
    logger.info(`tracker init pluginVersion=${pluginVersion} configured=${!!cfg.apiKey}`);
    this.emit({ event: "ready", data: { configured: !!cfg.apiKey } });
    if (!cfg.apiKey) {
      this.emit({ event: "not_configured" });
      return;
    }
    this.startTimer();
  }
  pause() {
    this.paused = true;
    this.stopTimer();
  }
  resume() {
    this.paused = false;
    if (!this.timer) this.startTimer();
  }
  shutdown() {
    this.stopTimer();
  }
  async activity(file, language) {
    if (this.paused) return;
    const cfg = loadConfig();
    if (!cfg.apiKey) return;
    const now = Date.now();
    this.lastActivity = now;
    const fileChanged = file !== void 0 && file !== this.lastFileInput;
    const langChanged = language !== void 0 && language !== this.currentLanguage;
    if (!fileChanged && !langChanged) {
      const dup = this.lastDedup;
      if (dup.file === file && dup.language === language && now - dup.at < DEDUP_WINDOW_MS) {
        return;
      }
    }
    const firstActivity = this.lastFileInput === void 0;
    const transition = (fileChanged || langChanged) && !firstActivity;
    if (file !== void 0) {
      this.lastFileInput = file;
      const fields = await resolveRepoFields(file, cfg.privacy);
      this.currentFile = fields.file;
      this.currentRepo = fields.repo;
      this.currentBranch = fields.branch;
      if (fileChanged) logger.debug("activity file", { file: fields.file, repo: fields.repo, branch: fields.branch });
    }
    if (language !== void 0) this.currentLanguage = language || void 0;
    if (firstActivity || transition) {
      this.pending.push(this.buildEvent(now, cfg));
    }
    this.lastDedup = { file, language, at: now };
  }
  async setStatus(message) {
    const cfg = loadConfig();
    if (!cfg.apiKey) {
      this.emit({ event: "status_error", data: { message: "not configured" } });
      return;
    }
    try {
      await sendStatus(cfg.apiKey, message);
      this.emit({ event: "status_ok" });
    } catch (e) {
      if (e instanceof InvalidApiKeyError) {
        this.stopTimer();
        this.emit({ event: "invalid_api_key" });
        return;
      }
      this.emit({ event: "status_error", data: { message: e.message } });
    }
  }
  getState() {
    return {
      configured: !!loadConfig().apiKey,
      tracking: !this.paused,
      offline: this.offline,
      codingTime: formatSeconds(this.todaySeconds),
      todaySeconds: this.todaySeconds
    };
  }
  startTimer() {
    this.timer = setInterval(() => this.tick().catch(() => {
    }), KEEPALIVE_INTERVAL_MS);
  }
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  async tick() {
    if (this.paused) return;
    const cfg = loadConfig();
    if (!cfg.apiKey) return;
    const now = Date.now();
    if (now - this.lastActivity > ACTIVITY_TIMEOUT_MS && this.pending.length === 0) {
      return;
    }
    if (this.currentFile !== void 0) {
      this.pending.push(this.buildEvent(now, cfg));
    }
    if (this.pending.length === 0) return;
    const batch = {
      plugin_version: this.pluginVersion,
      editor: this.editor,
      platform: currentPlatform(),
      heartbeats: this.pending
    };
    try {
      const resp = await sendBatch(cfg.apiKey, batch);
      this.pending = [];
      this.consecutiveErrors = 0;
      if (this.offline) {
        this.offline = false;
        logger.info("back online");
        this.emit({ event: "online" });
      }
      if (resp.today_seconds !== void 0) {
        this.todaySeconds = resp.today_seconds;
        this.emit({
          event: "heartbeat_ok",
          data: { today_seconds: resp.today_seconds, language: this.currentLanguage ?? null }
        });
      }
    } catch (err) {
      this.pending = [];
      if (err instanceof InvalidApiKeyError) {
        logger.error("tracker stopping: invalid api key");
        this.stopTimer();
        this.emit({ event: "invalid_api_key" });
        return;
      }
      this.consecutiveErrors++;
      logger.error(`heartbeat tick failed (consecutive=${this.consecutiveErrors})`, err);
      if (this.consecutiveErrors >= OFFLINE_THRESHOLD && !this.offline) {
        this.offline = true;
        logger.info("marking offline");
        this.emit({ event: "offline" });
      }
    }
  }
  // The privacy guards mirror those in resolveRepoFields, since flags can
  // toggle at runtime between activity() and tick() — never leak past a flip.
  buildEvent(now, cfg) {
    const { hideFileNames, hideProjectNames, hideBranchNames } = cfg.privacy;
    const ev = { time: now / 1e3 };
    if (this.currentFile !== void 0 && !hideFileNames) ev.file = this.currentFile;
    if (this.currentLanguage !== void 0) ev.language = this.currentLanguage;
    if (this.currentRepo !== void 0 && !hideProjectNames) ev.repo = this.currentRepo;
    if (this.currentBranch !== void 0 && !hideBranchNames && !hideProjectNames) {
      ev.branch = this.currentBranch;
    }
    return ev;
  }
};
function formatSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ../../devglobe-core/src/language.ts
var import_path = require("path");
var EXT_LANG = {
  ".js": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".ts": "TypeScript",
  ".mts": "TypeScript",
  ".cts": "TypeScript",
  ".jsx": "React JSX",
  ".tsx": "React TSX",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".astro": "Astro",
  ".html": "HTML",
  ".htm": "HTML",
  ".css": "CSS",
  ".sass": "Sass",
  ".scss": "SCSS",
  ".less": "Less",
  ".styl": "Stylus",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
  ".mdx": "MDX",
  ".hbs": "Handlebars",
  ".pug": "Pug",
  ".jade": "Pug",
  ".ejs": "EJS",
  ".erb": "ERB",
  ".haml": "Haml",
  ".twig": "Twig",
  ".blade.php": "Blade",
  ".liquid": "Liquid",
  ".mustache": "Mustache",
  ".njk": "Nunjucks",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".cxx": "C++",
  ".cc": "C++",
  ".hpp": "C++",
  ".hxx": "C++",
  ".rs": "Rust",
  ".go": "Go",
  ".zig": "Zig",
  ".d": "D",
  ".v": "V",
  ".odin": "Odin",
  ".mojo": "Mojo",
  ".java": "Java",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".scala": "Scala",
  ".sc": "Scala",
  ".groovy": "Groovy",
  ".cs": "C#",
  ".fs": "F#",
  ".fsx": "F#",
  ".vb": "Visual Basic",
  ".py": "Python",
  ".pyw": "Python",
  ".pyi": "Python",
  ".rb": "Ruby",
  ".php": "PHP",
  ".lua": "Lua",
  ".pl": "Perl",
  ".pm": "Perl",
  ".r": "R",
  ".R": "R",
  ".jl": "Julia",
  ".m": "MATLAB",
  ".swift": "Swift",
  ".dart": "Dart",
  ".mm": "Objective-C++",
  ".hs": "Haskell",
  ".lhs": "Haskell",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".erl": "Erlang",
  ".hrl": "Erlang",
  ".ml": "OCaml",
  ".mli": "OCaml",
  ".elm": "Elm",
  ".purs": "PureScript",
  ".clj": "Clojure",
  ".cljs": "Clojure",
  ".cljc": "Clojure",
  ".rkt": "Racket",
  ".scm": "Scheme",
  ".lisp": "Common Lisp",
  ".pro": "Prolog",
  ".gleam": "Gleam",
  ".roc": "Roc",
  ".idr": "Idris",
  ".agda": "Agda",
  ".lean": "Lean",
  ".nim": "Nim",
  ".cr": "Crystal",
  ".hx": "Haxe",
  ".ada": "Ada",
  ".adb": "Ada",
  ".ads": "Ada",
  ".f90": "Fortran",
  ".f95": "Fortran",
  ".f03": "Fortran",
  ".pas": "Pascal",
  ".pp": "Pascal",
  ".cob": "COBOL",
  ".cbl": "COBOL",
  ".vhd": "VHDL",
  ".vhdl": "VHDL",
  ".sv": "SystemVerilog",
  ".svh": "SystemVerilog",
  ".asm": "Assembly",
  ".s": "Assembly",
  ".cu": "CUDA",
  ".cuh": "CUDA",
  ".glsl": "GLSL",
  ".vert": "GLSL",
  ".frag": "GLSL",
  ".hlsl": "HLSL",
  ".wgsl": "WGSL",
  ".metal": "Metal",
  ".sh": "Bash",
  ".bash": "Bash",
  ".zsh": "Bash",
  ".fish": "Fish",
  ".ps1": "PowerShell",
  ".psm1": "PowerShell",
  ".bat": "Batch",
  ".cmd": "Batch",
  ".tf": "Terraform",
  ".tfvars": "Terraform",
  ".nix": "Nix",
  ".sql": "SQL",
  ".prisma": "Prisma",
  ".sol": "Solidity",
  ".vy": "Vyper",
  ".gd": "GDScript",
  ".gdshader": "Godot Shader",
  ".json": "JSON",
  ".jsonc": "JSON",
  ".jsonnet": "Jsonnet",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".xml": "XML",
  ".ini": "INI",
  ".env": "Env",
  ".properties": "Properties",
  ".csv": "CSV",
  ".tsv": "TSV",
  ".cue": "CUE",
  ".dhall": "Dhall",
  ".pkl": "Pkl",
  ".proto": "Protobuf",
  ".thrift": "Thrift",
  ".avro": "Avro",
  ".md": "Markdown",
  ".rst": "reStructuredText",
  ".tex": "LaTeX",
  ".bib": "BibTeX",
  ".typ": "Typst",
  ".adoc": "AsciiDoc",
  ".txt": "Plain Text",
  ".coffee": "CoffeeScript",
  ".tcl": "Tcl"
};
var NAME_LANG = {
  "Dockerfile": "Docker",
  "docker-compose.yml": "Docker Compose",
  "docker-compose.yaml": "Docker Compose",
  "Makefile": "Makefile",
  "CMakeLists.txt": "CMake",
  "Justfile": "Just",
  ".gitignore": "Gitignore",
  ".editorconfig": "EditorConfig"
};
function langFromPath(filePath) {
  const base = filePath.split("/").pop() || "";
  if (base in NAME_LANG) return NAME_LANG[base];
  const lowerBase = base.toLowerCase();
  for (const key of Object.keys(EXT_LANG)) {
    if (key.startsWith(".") && key.includes(".", 1) && lowerBase.endsWith(key)) {
      return EXT_LANG[key];
    }
  }
  const ext = (0, import_path.extname)(base).toLowerCase();
  if (!ext) return null;
  return EXT_LANG[ext] ?? null;
}

// src/index.ts
var PLUGIN_VERSION = "2.0.0";
var mode = process.argv[2];
if (mode === "lsp") {
  startLsp();
} else if (mode) {
  runSubcommand(mode, process.argv.slice(3));
} else {
  process.stderr.write("Usage: server.js <lsp|setup|status>\n");
  process.exit(1);
}
function startLsp() {
  const log = (msg) => process.stderr.write(`[DevGlobe:lsp] ${msg}
`);
  const tracker = new Tracker((event) => {
    if (event.event === "heartbeat_ok") {
      const { today_seconds, language } = event.data;
      const h = Math.floor(today_seconds / 3600);
      const m = Math.floor(today_seconds % 3600 / 60);
      const time = h > 0 ? `${h}h ${m}m` : `${m}m`;
      log(`Heartbeat OK \u2014 ${language || "Unknown"} \u2014 ${time} today`);
    } else if (event.event === "invalid_api_key") {
      log("Invalid API key \u2014 tracking stopped. Run /devglobe-setup with a valid key.");
    } else if (event.event === "offline") {
      log("Offline \u2014 heartbeats will retry when connection is back");
    } else if (event.event === "online") {
      log("Back online");
    }
  });
  let started = false;
  function ensureStarted() {
    if (started) return;
    const cfg = loadConfig();
    if (!cfg.apiKey) return;
    tracker.init(PLUGIN_VERSION, "zed");
    started = true;
    log("Tracking started");
  }
  ensureStarted();
  const fileLangs = /* @__PURE__ */ new Map();
  let buf = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => {
    buf += chunk;
    while (true) {
      const headerEnd = buf.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;
      const header = buf.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buf = buf.slice(headerEnd + 4);
        continue;
      }
      const len = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;
      if (buf.length < bodyStart + len) break;
      const body = buf.slice(bodyStart, bodyStart + len);
      buf = buf.slice(bodyStart + len);
      handleLspMessage(body);
    }
  });
  function sendLsp(msg) {
    const body = JSON.stringify(msg);
    process.stdout.write(`Content-Length: ${Buffer.byteLength(body)}\r
\r
${body}`);
  }
  function recordActivity(uri, languageHint) {
    if (!uri) return;
    const filePath = uriToPath(uri);
    const language = capitalizeLanguageId(languageHint) || fileLangs.get(uri) || langFromPath(filePath) || void 0;
    if (language) fileLangs.set(uri, language);
    ensureStarted();
    if (started) tracker.activity(filePath, language);
  }
  function handleLspMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.method) {
      case "initialize":
        sendLsp({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            capabilities: {
              textDocumentSync: {
                openClose: true,
                change: 2,
                // incremental
                save: { includeText: false }
              }
            },
            serverInfo: { name: "devglobe-ls", version: PLUGIN_VERSION }
          }
        });
        log("LSP initialized");
        break;
      case "initialized":
        break;
      case "textDocument/didOpen":
        recordActivity(msg.params?.textDocument?.uri, msg.params?.textDocument?.languageId);
        break;
      case "textDocument/didChange":
        recordActivity(msg.params?.textDocument?.uri);
        break;
      case "textDocument/didSave":
        recordActivity(msg.params?.textDocument?.uri);
        break;
      case "textDocument/didClose": {
        const uri = msg.params?.textDocument?.uri;
        if (uri) fileLangs.delete(uri);
        break;
      }
      case "shutdown":
        sendLsp({ jsonrpc: "2.0", id: msg.id, result: null });
        break;
      case "exit":
        tracker.shutdown();
        process.exit(0);
        break;
      default:
        if (msg.id !== void 0) {
          sendLsp({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
        }
        break;
    }
  }
  process.stdin.on("end", () => {
    tracker.shutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    tracker.shutdown();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    tracker.shutdown();
    process.exit(0);
  });
}
function runSubcommand(cmd, args) {
  switch (cmd) {
    case "setup": {
      const key = args[0];
      if (!key?.trim()) {
        console.log(
          "Usage: /devglobe-setup YOUR_API_KEY\n\nGet your key at https://devglobe.xyz/dashboard/settings"
        );
        process.exit(1);
      }
      setApiKey(key.trim());
      console.log(
        `Connected to DevGlobe!

API key saved to ${configPath()}.
You'll appear on the globe within 30 seconds.

Visibility settings (anonymous mode, repo sharing on the globe, profile mode) are managed at https://devglobe.xyz/dashboard/settings

Other commands: /devglobe-status MESSAGE`
      );
      break;
    }
    case "status": {
      const message = args.join(" ");
      const cfg = loadConfig();
      if (!cfg.apiKey) {
        console.log("No API key found. Run /devglobe-setup YOUR_KEY first.");
        process.exit(1);
      }
      sendStatus(cfg.apiKey, message).then(() => {
        console.log(message ? `Status set to "${message}"` : "Status cleared.");
      }).catch((err) => {
        console.log(`Failed to update status: ${err instanceof Error ? err.message : "unknown"}`);
        process.exit(1);
      });
      break;
    }
    default:
      console.log("Unknown command. Available: setup, status");
      process.exit(1);
  }
}
function uriToPath(uri) {
  try {
    const pathname = decodeURIComponent(new URL(uri).pathname);
    if (process.platform === "win32" && pathname.match(/^\/[a-zA-Z]:/)) {
      return pathname.slice(1);
    }
    return pathname;
  } catch {
    return uri;
  }
}
function capitalizeLanguageId(id) {
  if (!id) return void 0;
  const map = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    javascriptreact: "JSX",
    typescriptreact: "TSX",
    python: "Python",
    rust: "Rust",
    go: "Go",
    c: "C",
    cpp: "C++",
    csharp: "C#",
    java: "Java",
    kotlin: "Kotlin",
    scala: "Scala",
    groovy: "Groovy",
    swift: "Swift",
    dart: "Dart",
    ruby: "Ruby",
    php: "PHP",
    lua: "Lua",
    perl: "Perl",
    r: "R",
    julia: "Julia",
    matlab: "MATLAB",
    haskell: "Haskell",
    elixir: "Elixir",
    erlang: "Erlang",
    ocaml: "OCaml",
    elm: "Elm",
    purescript: "PureScript",
    clojure: "Clojure",
    racket: "Racket",
    scheme: "Scheme",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    sass: "Sass",
    less: "Less",
    json: "JSON",
    jsonc: "JSON",
    yaml: "YAML",
    toml: "TOML",
    xml: "XML",
    ini: "INI",
    markdown: "Markdown",
    latex: "LaTeX",
    typst: "Typst",
    sql: "SQL",
    prisma: "Prisma",
    graphql: "GraphQL",
    shellscript: "Bash",
    powershell: "PowerShell",
    fish: "Fish",
    dockerfile: "Docker",
    makefile: "Makefile",
    nix: "Nix",
    terraform: "Terraform",
    vue: "Vue",
    svelte: "Svelte",
    astro: "Astro",
    zig: "Zig",
    nim: "Nim",
    v: "V",
    solidity: "Solidity",
    gdscript: "GDScript",
    glsl: "GLSL",
    hlsl: "HLSL",
    wgsl: "WGSL",
    metal: "Metal",
    assembly: "Assembly",
    vhdl: "VHDL",
    verilog: "Verilog",
    protobuf: "Protobuf",
    proto: "Protobuf",
    plaintext: "Plain Text"
  };
  return map[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}
