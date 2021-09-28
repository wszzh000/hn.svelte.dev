var __require = typeof require !== "undefined" ? require : (x) => {
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _map;
function get_single_valued_header(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function coalesce_to_error(err) {
  return err instanceof Error || err && err.name && err.message ? err : new Error(JSON.stringify(err));
}
function lowercase_keys(obj) {
  const clone = {};
  for (const key in obj) {
    clone[key.toLowerCase()] = obj[key];
  }
  return clone;
}
function error(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler) {
    return;
  }
  const params = route.params(match);
  const response = await handler({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop$1() {
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
Promise.resolve();
const subscriber_queue = [];
function writable(value, start = noop$1) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop$1) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop$1;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
const s$1 = JSON.stringify;
async function render_response({
  branch,
  options: options2,
  $session,
  page_config,
  status,
  error: error2,
  page: page2
}) {
  const css2 = new Set(options2.entry.css);
  const js = new Set(options2.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options2.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable($session);
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        session
      },
      page: page2,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options2.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options2.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options2.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options2.entry.file)};
			start({
				target: ${options2.target ? `document.querySelector(${s$1(options2.target)})` : "document.body"},
				paths: ${s$1(options2.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page2 && page2.host ? s$1(page2.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options2.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page2 && page2.host ? s$1(page2.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page2 && page2.path)},
						query: new URLSearchParams(${page2 ? s$1(page2.query.toString()) : ""}),
						params: ${page2 && s$1(page2.params)}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options2.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options2.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options2.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options2.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url="${url}"`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options2.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options2.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(coalesce_to_error(err));
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ ...error2, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  if (loaded.context) {
    throw new Error('You are returning "context" from a load function. "context" was renamed to "stuff", please adjust your code accordingly.');
  }
  return loaded;
}
const s = JSON.stringify;
async function load_node({
  request,
  options: options2,
  state,
  route,
  page: page2,
  node,
  $session,
  stuff,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page2, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const filename = resolved.replace(options2.paths.assets, "").slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options2.manifest.assets.find((d2) => d2.file === filename || d2.file === filename_html);
        if (asset) {
          response = options2.read ? new Response(options2.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page2.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = {
            ...opts.headers
          };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options2, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options2.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key2 !== "etag") {
                    headers[key2] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":${escape$1(body)}}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      stuff: { ...stuff }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    stuff: loaded.stuff || stuff,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
const escaped$2 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape$1(str) {
  let result = '"';
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$2) {
      result += escaped$2[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += `\\u${code.toString(16).toUpperCase()}`;
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
const absolute = /^([a-z]+:)?\/?\//;
function resolve(base2, path) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
async function respond_with_error({ request, options: options2, state, $session, status, error: error2 }) {
  const default_layout = await options2.load_component(options2.manifest.layout);
  const default_error = await options2.load_component(options2.manifest.error);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options2,
    state,
    route: null,
    page: page2,
    node: default_layout,
    $session,
    stuff: {},
    prerender_enabled: is_prerender_enabled(options2, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options2,
      state,
      route: null,
      page: page2,
      node: default_error,
      $session,
      stuff: loaded ? loaded.stuff : {},
      prerender_enabled: is_prerender_enabled(options2, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options2,
      $session,
      page_config: {
        hydrate: options2.hydrate,
        router: options2.router,
        ssr: options2.ssr
      },
      status,
      error: error2,
      branch,
      page: page2
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options2, node, state) {
  return options2.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options2, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options2.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options2,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options2);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: ""
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let stuff = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              stuff,
              prerender_enabled: is_prerender_enabled(options2, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options2.handle_error(e, request);
            status = 500;
            error2 = e;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options2.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    stuff: node_loaded.stuff,
                    prerender_enabled: is_prerender_enabled(options2, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options2);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options2.handle_error(e, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options2,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.stuff) {
          stuff = {
            ...stuff,
            ...loaded.loaded.stuff
          };
        }
      }
    }
  try {
    return with_cookies(await render_response({
      ...opts,
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    }), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options2.handle_error(error3, request);
    return with_cookies(await respond_with_error({
      ...opts,
      status: 500,
      error: error3
    }), set_cookie_headers);
  }
}
function get_page_config(leaf, options2) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options2.ssr,
    router: "router" in leaf ? !!leaf.router : options2.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options2.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options2, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options2.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options2,
    state,
    $session,
    route,
    page: page2
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
class ReadOnlyFormData {
  constructor(map) {
    __privateAdd(this, _map, void 0);
    __privateSet(this, _map, map);
  }
  get(key) {
    const value = __privateGet(this, _map).get(key);
    return value && value[0];
  }
  getAll(key) {
    return __privateGet(this, _map).get(key);
  }
  has(key) {
    return __privateGet(this, _map).has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key] of __privateGet(this, _map))
      yield key;
  }
  *values() {
    for (const [, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield value[i];
      }
    }
  }
}
_map = new WeakMap();
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data;
}
async function respond(incoming, options2, state = {}) {
  if (incoming.path !== "/" && options2.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options2.trailing_slash === "never" || !has_trailing_slash && options2.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options2.paths.base + path + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options2.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options2,
            $session: await options2.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        const decoded = decodeURI(request2.path);
        for (const route of options2.manifest.routes) {
          const match = route.pattern.exec(decoded);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options2, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: ""
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options2.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options2,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options2.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options2.dev ? e.stack : e.message
    };
  }
}
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
function getContext(key) {
  return get_current_component().$$.context.get(key);
}
Promise.resolve();
const escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
const missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
let on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(parent_component ? parent_component.$$.context : context || []),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
var root_svelte_svelte_type_style_lang = "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}";
const css$8 = {
  code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n<\/script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}/>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\t{title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t#svelte-announcer {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\tclip: rect(0 0 0 0);\\n\\t\\tclip-path: inset(50%);\\n\\t\\toverflow: hidden;\\n\\t\\twhite-space: nowrap;\\n\\t\\twidth: 1px;\\n\\t\\theight: 1px;\\n\\t}\\n</style>"],"names":[],"mappings":"AAsDC,iBAAiB,eAAC,CAAC,AAClB,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnB,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACZ,CAAC"}`
};
const Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page: page2 } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page2 !== void 0)
    $$bindings.page(page2);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css$8);
  {
    stores.page.set(page2);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${``}`;
});
let base = "";
let assets = "";
function set_paths(paths) {
  base = paths.base;
  assets = paths.assets || base;
}
function set_prerendering(value) {
}
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module"
});
const template = ({ head, body }) => `<!doctype html>
<html lang="en">

<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width">
	<meta name="theme-color" content="#333333">

	<script>
		try {
			if (!('theme' in localStorage)) {
				localStorage.theme = window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
			}

			document.querySelector('html').classList.add(localStorage.theme);
		} catch (e) {
			console.error(e);
		}
	<\/script>

	<link rel="manifest" href="/manifest.json">
	<link rel="icon" type="image/png" href="/favicon.png">

	` + head + '\n</head>\n\n<body>\n	<div id="svelte">' + body + "</div>\n</body>\n\n</html>\n";
let options = null;
const default_settings = { paths: { "base": "", "assets": "" } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-3556cbdb.js",
      css: [assets + "/_app/assets/start-61d1577b.css"],
      js: [assets + "/_app/start-3556cbdb.js", assets + "/_app/chunks/vendor-67bd6b47.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: true,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
const d = (s2) => s2.replace(/%23/g, "#").replace(/%3[Bb]/g, ";").replace(/%2[Cc]/g, ",").replace(/%2[Ff]/g, "/").replace(/%3[Ff]/g, "?").replace(/%3[Aa]/g, ":").replace(/%40/g, "@").replace(/%26/g, "&").replace(/%3[Dd]/g, "=").replace(/%2[Bb]/g, "+").replace(/%24/g, "$");
const empty = () => ({});
const manifest = {
  assets: [{ "file": "favicon.png", "size": 3210, "type": "image/png" }, { "file": "logo-192.png", "size": 4918, "type": "image/png" }, { "file": "logo-512.png", "size": 14047, "type": "image/png" }, { "file": "manifest.json", "size": 352, "type": "application/json" }, { "file": "robots.txt", "size": 25, "type": "text/plain" }],
  layout: "src/routes/__layout.svelte",
  error: "src/routes/__error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/about\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/about.svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/item\/([^/]+?)\/?$/,
      params: (m) => ({ id: d(m[1]) }),
      a: ["src/routes/__layout.svelte", "src/routes/item/[id].svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/user\/([^/]+?)\/?$/,
      params: (m) => ({ name: d(m[1]) }),
      a: ["src/routes/__layout.svelte", "src/routes/user/[name].svelte"],
      b: ["src/routes/__error.svelte"]
    },
    {
      type: "endpoint",
      pattern: /^\/rss\/?$/,
      params: empty,
      load: () => Promise.resolve().then(function() {
        return rss$1;
      })
    },
    {
      type: "endpoint",
      pattern: /^\/([^/]+?)\/rss\/?$/,
      params: (m) => ({ list: d(m[1]) }),
      load: () => Promise.resolve().then(function() {
        return rss;
      })
    },
    {
      type: "page",
      pattern: /^\/([^/]+?)\/([^/]+?)\/?$/,
      params: (m) => ({ list: d(m[1]), page: d(m[2]) }),
      a: ["src/routes/__layout.svelte", "src/routes/[list]/[page].svelte"],
      b: ["src/routes/__error.svelte"]
    }
  ]
};
const get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
  externalFetch: hooks.externalFetch || fetch
});
const module_lookup = {
  "src/routes/__layout.svelte": () => Promise.resolve().then(function() {
    return __layout;
  }),
  "src/routes/__error.svelte": () => Promise.resolve().then(function() {
    return __error;
  }),
  "src/routes/index.svelte": () => Promise.resolve().then(function() {
    return index;
  }),
  "src/routes/about.svelte": () => Promise.resolve().then(function() {
    return about;
  }),
  "src/routes/item/[id].svelte": () => Promise.resolve().then(function() {
    return _id_;
  }),
  "src/routes/user/[name].svelte": () => Promise.resolve().then(function() {
    return _name_;
  }),
  "src/routes/[list]/[page].svelte": () => Promise.resolve().then(function() {
    return _page_;
  })
};
const metadata_lookup = { "src/routes/__layout.svelte": { "entry": "pages/__layout.svelte-5e7b9f95.js", "css": ["assets/pages/__layout.svelte-8e782774.css"], "js": ["pages/__layout.svelte-5e7b9f95.js", "chunks/vendor-67bd6b47.js"], "styles": [] }, "src/routes/__error.svelte": { "entry": "pages/__error.svelte-4e033f32.js", "css": ["assets/pages/__error.svelte-66d11879.css"], "js": ["pages/__error.svelte-4e033f32.js", "chunks/vendor-67bd6b47.js"], "styles": [] }, "src/routes/index.svelte": { "entry": "pages/index.svelte-0de9c966.js", "css": [], "js": ["pages/index.svelte-0de9c966.js", "chunks/vendor-67bd6b47.js"], "styles": [] }, "src/routes/about.svelte": { "entry": "pages/about.svelte-eb89ca99.js", "css": [], "js": ["pages/about.svelte-eb89ca99.js", "chunks/vendor-67bd6b47.js"], "styles": [] }, "src/routes/item/[id].svelte": { "entry": "pages/item/[id].svelte-0cdcb721.js", "css": ["assets/pages/item/[id].svelte-49e2747f.css"], "js": ["pages/item/[id].svelte-0cdcb721.js", "chunks/vendor-67bd6b47.js"], "styles": [] }, "src/routes/user/[name].svelte": { "entry": "pages/user/[name].svelte-611a9876.js", "css": [], "js": ["pages/user/[name].svelte-611a9876.js", "chunks/vendor-67bd6b47.js"], "styles": [] }, "src/routes/[list]/[page].svelte": { "entry": "pages/[list]/[page].svelte-eaed3eed.js", "css": ["assets/pages/[list]/[page].svelte-d37502c6.css"], "js": ["pages/[list]/[page].svelte-eaed3eed.js", "chunks/vendor-67bd6b47.js"], "styles": [] } };
async function load_component(file) {
  const { entry, css: css2, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css2.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render$1(request, {
  prerender: prerender2
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options, { prerender: prerender2 });
}
const dev = false;
function get$1() {
  return {
    headers: { Location: "/top/rss" },
    status: dev ? 302 : 301
  };
}
var rss$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get: get$1
});
const render = (list, items) => `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
	<title>Svelte HN (${list})</title>
	<link>https://hn.svelte.dev/${list}/1</link>
	<description>Links from the orange site</description>
	<image>
		<url>https://hn.svelte.dev/favicon.png</url>
		<title>Svelte HN (${list})</title>
		<link>https://hn.svelte.dev/${list}/1</link>
	</image>
	${items.map((item) => `
				<item>
					<title>${item.title}${item.domain ? ` (${item.domain})` : ""}</title>
					<link>https://hn.svelte.dev/item/${item.id}</link>
					<description><![CDATA[${item.url ? `<a href="${item.url}">link</a> / ` : ""}<a href="https://hn.svelte.dev/item/${item.id}">comments</a>
					]]></description>
					<pubDate>${new Date(item.time * 1e3).toUTCString()}</pubDate>
				</item>
			`).join("\n")}
</channel>
</rss>`;
function get({ params }) {
  const list = params.list === "top" ? "news" : params.list === "new" ? "newest" : params.list;
  fetch(`https://api.hnpwa.com/v0/${list}/1.json`).then((r) => r.json()).then((items) => {
    const feed = render(list, items);
    return {
      body: feed,
      headers: {
        "Cache-Control": `max-age=0, s-max-age=${600}`,
        "Content-Type": "application/rss+xml"
      }
    };
  });
}
var rss = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  get
});
const getStores = () => {
  const stores = getContext("__svelte__");
  return {
    page: {
      subscribe: stores.page.subscribe
    },
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    get preloading() {
      console.error("stores.preloading is deprecated; use stores.navigating instead");
      return {
        subscribe: stores.navigating.subscribe
      };
    },
    session: stores.session
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
const navigating = {
  subscribe(fn) {
    const store = getStores().navigating;
    return store.subscribe(fn);
  }
};
var Nav_svelte_svelte_type_style_lang = "nav.svelte-7jmz2r{border-bottom:1px solid #ff6600;color:var(--fg-light);font-weight:300;padding:0 1em}.icon.svelte-7jmz2r{display:block;width:1em;height:1em;float:left;font-size:2em;position:relative;top:0.4em;box-sizing:border-box;margin:0 0.5em 0 0}ul.svelte-7jmz2r{margin:0;padding:0}ul.svelte-7jmz2r::after{content:'';display:block;clear:both}li.svelte-7jmz2r{display:block;float:left}.about.svelte-7jmz2r{float:right}.selected.svelte-7jmz2r{position:relative;display:inline-block;color:var(--fg)}.selected.svelte-7jmz2r::after{position:absolute;content:'';width:calc(100% - 1em);height:2px;background-color:#ff6600;display:block;bottom:0}a.svelte-7jmz2r{color:inherit;text-decoration:none;padding:1em 0.5em;display:block;font-weight:500}@media(min-width: 400px){.icon.svelte-7jmz2r{margin:0 0.5em 0 0}li.svelte-7jmz2r{display:inline-block}}";
const css$7 = {
  code: "nav.svelte-7jmz2r{border-bottom:1px solid #ff6600;color:var(--fg-light);font-weight:300;padding:0 1em}.icon.svelte-7jmz2r{display:block;width:1em;height:1em;float:left;font-size:2em;position:relative;top:0.4em;box-sizing:border-box;margin:0 0.5em 0 0}ul.svelte-7jmz2r{margin:0;padding:0}ul.svelte-7jmz2r::after{content:'';display:block;clear:both}li.svelte-7jmz2r{display:block;float:left}.about.svelte-7jmz2r{float:right}.selected.svelte-7jmz2r{position:relative;display:inline-block;color:var(--fg)}.selected.svelte-7jmz2r::after{position:absolute;content:'';width:calc(100% - 1em);height:2px;background-color:#ff6600;display:block;bottom:0}a.svelte-7jmz2r{color:inherit;text-decoration:none;padding:1em 0.5em;display:block;font-weight:500}@media(min-width: 400px){.icon.svelte-7jmz2r{margin:0 0.5em 0 0}li.svelte-7jmz2r{display:inline-block}}",
  map: `{"version":3,"file":"Nav.svelte","sources":["Nav.svelte"],"sourcesContent":["<script>\\n\\texport let section;\\n<\/script>\\n\\n<nav>\\n\\t<img alt=\\"Svelte Hacker News logo\\" class=\\"icon\\" src=\\"/favicon.png\\">\\n\\n\\t<ul>\\n\\t\\t<li><a sveltekit:prefetch href=\\"/top/1\\" class:selected={section === 'top'}>top</a></li>\\n\\t\\t<li><a sveltekit:prefetch href=\\"/new/1\\" class:selected={section === 'new'}>new</a></li>\\n\\t\\t<li><a sveltekit:prefetch href=\\"/show/1\\" class:selected={section === 'show'}>show</a></li>\\n\\t\\t<li><a sveltekit:prefetch href=\\"/ask/1\\" class:selected={section === 'ask'}>ask</a></li>\\n\\t\\t<li><a sveltekit:prefetch href=\\"/jobs/1\\" class:selected={section === 'jobs'}>jobs</a></li>\\n\\n\\t\\t<li class=\\"about\\"><a sveltekit:prefetch href=\\"/about\\" class:selected={section === 'about'}>about</a></li>\\n\\t</ul>\\n</nav>\\n\\n<style>\\n\\tnav {\\n\\t\\t/* background-color: rgba(255, 102, 0, 0.05); */\\n\\t\\tborder-bottom: 1px solid #ff6600;\\n\\t\\tcolor: var(--fg-light);\\n\\t\\tfont-weight: 300;\\n\\t\\tpadding: 0 1em;\\n\\t}\\n\\n\\t.icon {\\n\\t\\tdisplay: block;\\n\\t\\twidth: 1em;\\n\\t\\theight: 1em;\\n\\t\\tfloat: left;\\n\\t\\tfont-size: 2em;\\n\\t\\tposition: relative;\\n\\t\\ttop: 0.4em;\\n\\t\\tbox-sizing: border-box;\\n\\t\\tmargin: 0 0.5em 0 0;\\n\\t}\\n\\n\\tul {\\n\\t\\tmargin: 0;\\n\\t\\tpadding: 0;\\n\\t}\\n\\n\\tul::after {\\n\\t\\tcontent: '';\\n\\t\\tdisplay: block;\\n\\t\\tclear: both;\\n\\t}\\n\\n\\tli {\\n\\t\\tdisplay: block;\\n\\t\\tfloat: left;\\n\\t}\\n\\n\\t.about {\\n\\t\\tfloat: right;\\n\\t}\\n\\n\\t.selected {\\n\\t\\tposition: relative;\\n\\t\\tdisplay: inline-block;\\n\\t\\tcolor: var(--fg);\\n\\t}\\n\\n\\t.selected::after {\\n\\t\\tposition: absolute;\\n\\t\\tcontent: '';\\n\\t\\twidth: calc(100% - 1em);\\n\\t\\theight: 2px;\\n\\t\\tbackground-color: #ff6600;\\n\\t\\tdisplay: block;\\n\\t\\tbottom: 0;\\n\\t}\\n\\n\\ta {\\n\\t\\tcolor: inherit;\\n\\t\\ttext-decoration: none;\\n\\t\\tpadding: 1em 0.5em;\\n\\t\\tdisplay: block;\\n\\t\\tfont-weight: 500;\\n\\t}\\n\\n\\t@media (min-width: 400px) {\\n\\t\\t.icon {\\n\\t\\t\\tmargin: 0 0.5em 0 0;\\n\\t\\t}\\n\\n\\t\\tli {\\n\\t\\t\\tdisplay: inline-block;\\n\\t\\t}\\n\\t}\\n</style>\\n"],"names":[],"mappings":"AAmBC,GAAG,cAAC,CAAC,AAEJ,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,OAAO,CAChC,KAAK,CAAE,IAAI,UAAU,CAAC,CACtB,WAAW,CAAE,GAAG,CAChB,OAAO,CAAE,CAAC,CAAC,GAAG,AACf,CAAC,AAED,KAAK,cAAC,CAAC,AACN,OAAO,CAAE,KAAK,CACd,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,CACX,KAAK,CAAE,IAAI,CACX,SAAS,CAAE,GAAG,CACd,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,KAAK,CACV,UAAU,CAAE,UAAU,CACtB,MAAM,CAAE,CAAC,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,AACpB,CAAC,AAED,EAAE,cAAC,CAAC,AACH,MAAM,CAAE,CAAC,CACT,OAAO,CAAE,CAAC,AACX,CAAC,AAED,gBAAE,OAAO,AAAC,CAAC,AACV,OAAO,CAAE,EAAE,CACX,OAAO,CAAE,KAAK,CACd,KAAK,CAAE,IAAI,AACZ,CAAC,AAED,EAAE,cAAC,CAAC,AACH,OAAO,CAAE,KAAK,CACd,KAAK,CAAE,IAAI,AACZ,CAAC,AAED,MAAM,cAAC,CAAC,AACP,KAAK,CAAE,KAAK,AACb,CAAC,AAED,SAAS,cAAC,CAAC,AACV,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,YAAY,CACrB,KAAK,CAAE,IAAI,IAAI,CAAC,AACjB,CAAC,AAED,uBAAS,OAAO,AAAC,CAAC,AACjB,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,EAAE,CACX,KAAK,CAAE,KAAK,IAAI,CAAC,CAAC,CAAC,GAAG,CAAC,CACvB,MAAM,CAAE,GAAG,CACX,gBAAgB,CAAE,OAAO,CACzB,OAAO,CAAE,KAAK,CACd,MAAM,CAAE,CAAC,AACV,CAAC,AAED,CAAC,cAAC,CAAC,AACF,KAAK,CAAE,OAAO,CACd,eAAe,CAAE,IAAI,CACrB,OAAO,CAAE,GAAG,CAAC,KAAK,CAClB,OAAO,CAAE,KAAK,CACd,WAAW,CAAE,GAAG,AACjB,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AAC1B,KAAK,cAAC,CAAC,AACN,MAAM,CAAE,CAAC,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,AACpB,CAAC,AAED,EAAE,cAAC,CAAC,AACH,OAAO,CAAE,YAAY,AACtB,CAAC,AACF,CAAC"}`
};
const Nav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { section } = $$props;
  if ($$props.section === void 0 && $$bindings.section && section !== void 0)
    $$bindings.section(section);
  $$result.css.add(css$7);
  return `<nav class="${"svelte-7jmz2r"}"><img alt="${"Svelte Hacker News logo"}" class="${"icon svelte-7jmz2r"}" src="${"/favicon.png"}">

	<ul class="${"svelte-7jmz2r"}"><li class="${"svelte-7jmz2r"}"><a sveltekit:prefetch href="${"/top/1"}" class="${["svelte-7jmz2r", section === "top" ? "selected" : ""].join(" ").trim()}">top</a></li>
		<li class="${"svelte-7jmz2r"}"><a sveltekit:prefetch href="${"/new/1"}" class="${["svelte-7jmz2r", section === "new" ? "selected" : ""].join(" ").trim()}">new</a></li>
		<li class="${"svelte-7jmz2r"}"><a sveltekit:prefetch href="${"/show/1"}" class="${["svelte-7jmz2r", section === "show" ? "selected" : ""].join(" ").trim()}">show</a></li>
		<li class="${"svelte-7jmz2r"}"><a sveltekit:prefetch href="${"/ask/1"}" class="${["svelte-7jmz2r", section === "ask" ? "selected" : ""].join(" ").trim()}">ask</a></li>
		<li class="${"svelte-7jmz2r"}"><a sveltekit:prefetch href="${"/jobs/1"}" class="${["svelte-7jmz2r", section === "jobs" ? "selected" : ""].join(" ").trim()}">jobs</a></li>

		<li class="${"about svelte-7jmz2r"}"><a sveltekit:prefetch href="${"/about"}" class="${["svelte-7jmz2r", section === "about" ? "selected" : ""].join(" ").trim()}">about</a></li></ul>
</nav>`;
});
var PreloadingIndicator_svelte_svelte_type_style_lang = ".progress-container.svelte-3yzzc9{position:absolute;top:0;left:0;width:100%;height:4px;z-index:999}.progress.svelte-3yzzc9{position:absolute;left:0;top:0;height:100%;background-color:#ff6600;transition:width 0.4s}.fade.svelte-3yzzc9{position:fixed;width:100%;height:100%;background-color:rgba(255, 255, 255, 0.3);pointer-events:none;z-index:998;animation:svelte-3yzzc9-fade 0.4s}@keyframes svelte-3yzzc9-fade{from{opacity:0}to{opacity:1}}";
const css$6 = {
  code: ".progress-container.svelte-3yzzc9{position:absolute;top:0;left:0;width:100%;height:4px;z-index:999}.progress.svelte-3yzzc9{position:absolute;left:0;top:0;height:100%;background-color:#ff6600;transition:width 0.4s}.fade.svelte-3yzzc9{position:fixed;width:100%;height:100%;background-color:rgba(255, 255, 255, 0.3);pointer-events:none;z-index:998;animation:svelte-3yzzc9-fade 0.4s}@keyframes svelte-3yzzc9-fade{from{opacity:0}to{opacity:1}}",
  map: `{"version":3,"file":"PreloadingIndicator.svelte","sources":["PreloadingIndicator.svelte"],"sourcesContent":["<script>\\n\\timport { onMount } from 'svelte';\\n\\tlet p = 0;\\n\\tlet visible = false;\\n\\tonMount(() => {\\n\\t\\tvisible = true;\\n\\t\\tfunction next() {\\n\\t\\t\\tp += 0.1;\\n\\t\\t\\tconst remaining = 1 - p;\\n\\t\\t\\tif (remaining > 0.15) setTimeout(next, 500 / remaining);\\n\\t\\t}\\n\\t\\tsetTimeout(next, 250);\\n\\t});\\n<\/script>\\n\\n<style>\\n\\t.progress-container {\\n\\t\\tposition: absolute;\\n\\t\\ttop: 0;\\n\\t\\tleft: 0;\\n\\t\\twidth: 100%;\\n\\t\\theight: 4px;\\n\\t\\tz-index: 999;\\n\\t}\\n\\n\\t.progress {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\theight: 100%;\\n\\t\\tbackground-color: #ff6600;\\n\\t\\ttransition: width 0.4s;\\n\\t}\\n\\n\\t.fade {\\n\\t\\tposition: fixed;\\n\\t\\twidth: 100%;\\n\\t\\theight: 100%;\\n\\t\\tbackground-color: rgba(255, 255, 255, 0.3);\\n\\t\\tpointer-events: none;\\n\\t\\tz-index: 998;\\n\\t\\tanimation: fade 0.4s;\\n\\t}\\n\\n\\t:global(html).dark .fade {\\n\\t\\tbackground-color: rgba(0, 0, 0, 0.3);\\n\\t}\\n\\n\\t@keyframes fade {\\n\\t\\tfrom {\\n\\t\\t\\topacity: 0;\\n\\t\\t}\\n\\t\\tto {\\n\\t\\t\\topacity: 1;\\n\\t\\t}\\n\\t}\\n</style>\\n\\n{#if visible}\\n\\t<div class=\\"progress-container\\">\\n\\t\\t<div class=\\"progress\\" style=\\"width: {p * 100}%\\" />\\n\\t</div>\\n{/if}\\n\\n{#if p >= 0.4}\\n\\t<div class=\\"fade\\" />\\n{/if}\\n"],"names":[],"mappings":"AAgBC,mBAAmB,cAAC,CAAC,AACpB,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,CAAC,CACP,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,GAAG,CACX,OAAO,CAAE,GAAG,AACb,CAAC,AAED,SAAS,cAAC,CAAC,AACV,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,MAAM,CAAE,IAAI,CACZ,gBAAgB,CAAE,OAAO,CACzB,UAAU,CAAE,KAAK,CAAC,IAAI,AACvB,CAAC,AAED,KAAK,cAAC,CAAC,AACN,QAAQ,CAAE,KAAK,CACf,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,gBAAgB,CAAE,KAAK,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,GAAG,CAAC,CAC1C,cAAc,CAAE,IAAI,CACpB,OAAO,CAAE,GAAG,CACZ,SAAS,CAAE,kBAAI,CAAC,IAAI,AACrB,CAAC,AAMD,WAAW,kBAAK,CAAC,AAChB,IAAI,AAAC,CAAC,AACL,OAAO,CAAE,CAAC,AACX,CAAC,AACD,EAAE,AAAC,CAAC,AACH,OAAO,CAAE,CAAC,AACX,CAAC,AACF,CAAC"}`
};
const PreloadingIndicator = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$6);
  return `${``}

${``}`;
});
var ThemeToggler_svelte_svelte_type_style_lang = "button.svelte-15rngbk{position:fixed;right:1em;bottom:1em;width:2em;height:2em;text-indent:-9999px;background-color:transparent;border:none;opacity:0.4}.nice.svelte-15rngbk{outline:none}svg.svelte-15rngbk{position:absolute;width:100%;height:100%;right:0;bottom:0}path.svelte-15rngbk{fill:var(--fg);transition:opacity 0.6s}.dark.svelte-15rngbk{opacity:0}";
const css$5 = {
  code: "button.svelte-15rngbk{position:fixed;right:1em;bottom:1em;width:2em;height:2em;text-indent:-9999px;background-color:transparent;border:none;opacity:0.4}.nice.svelte-15rngbk{outline:none}svg.svelte-15rngbk{position:absolute;width:100%;height:100%;right:0;bottom:0}path.svelte-15rngbk{fill:var(--fg);transition:opacity 0.6s}.dark.svelte-15rngbk{opacity:0}",
  map: `{"version":3,"file":"ThemeToggler.svelte","sources":["ThemeToggler.svelte"],"sourcesContent":["<script>\\n\\t// preserve the focus ring for keyboard users because a11y,\\n\\t// but hide for mouse users because fugly\\n\\tlet nice = false;\\n\\n\\tlet theme = 'light';\\n\\n\\ttry {\\n\\t\\ttheme = localStorage.theme;\\n\\t} catch (e) {\\n\\t\\t// ignore \u2014 could be SSR, or e.g. Firefox with restrictive permissions\\n\\t}\\n\\n\\tconst toggle = () => {\\n\\t\\tconst { classList } = document.querySelector('html');\\n\\t\\tclassList.remove(theme);\\n\\t\\ttheme = theme === 'light' ? 'dark' : 'light';\\n\\t\\tclassList.add(theme);\\n\\n\\t\\ttry {\\n\\t\\t\\tlocalStorage.theme = theme;\\n\\t\\t} catch (e) {\\n\\t\\t\\t// ignore\\n\\t\\t}\\n\\t};\\n<\/script>\\n\\n<button\\n\\taria-label=\\"Toggle theme\\"\\n\\ttitle=\\"Toggle theme\\"\\n\\tclass:nice\\n\\ton:mousedown=\\"{() => nice = true}\\"\\n\\ton:blur=\\"{() => nice = false}\\"\\n\\ton:click={toggle}\\n>\\n\\ttoggle theme\\n\\n\\t<svg viewBox=\\"0 0 24 24\\">\\n\\t\\t<path class=\\"light\\" d=\\"M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,15.31L23.31,12L20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31Z\\" />\\n\\t\\t<path class=\\"dark\\" d=\\"M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z\\" />\\n\\t</svg>\\n</button>\\n\\n<style>\\n\\tbutton {\\n\\t\\tposition: fixed;\\n\\t\\tright: 1em;\\n\\t\\tbottom: 1em;\\n\\t\\twidth: 2em;\\n\\t\\theight: 2em;\\n\\t\\ttext-indent: -9999px;\\n\\t\\tbackground-color: transparent;\\n\\t\\tborder: none;\\n\\t\\topacity: 0.4;\\n\\t}\\n\\n\\t.nice {\\n\\t\\toutline: none;\\n\\t}\\n\\n\\tsvg {\\n\\t\\tposition: absolute;\\n\\t\\twidth: 100%;\\n\\t\\theight: 100%;\\n\\t\\tright: 0;\\n\\t\\tbottom: 0;\\n\\t}\\n\\n\\tpath {\\n\\t\\tfill: var(--fg);\\n\\t\\ttransition: opacity 0.6s;\\n\\t}\\n\\n\\t.dark {\\n\\t\\topacity: 0;\\n\\t}\\n\\n\\t:global(html).dark .dark {\\n\\t\\topacity: 1;\\n\\t}\\n</style>"],"names":[],"mappings":"AA4CC,MAAM,eAAC,CAAC,AACP,QAAQ,CAAE,KAAK,CACf,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,CACX,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,CACX,WAAW,CAAE,OAAO,CACpB,gBAAgB,CAAE,WAAW,CAC7B,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,GAAG,AACb,CAAC,AAED,KAAK,eAAC,CAAC,AACN,OAAO,CAAE,IAAI,AACd,CAAC,AAED,GAAG,eAAC,CAAC,AACJ,QAAQ,CAAE,QAAQ,CAClB,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,KAAK,CAAE,CAAC,CACR,MAAM,CAAE,CAAC,AACV,CAAC,AAED,IAAI,eAAC,CAAC,AACL,IAAI,CAAE,IAAI,IAAI,CAAC,CACf,UAAU,CAAE,OAAO,CAAC,IAAI,AACzB,CAAC,AAED,KAAK,eAAC,CAAC,AACN,OAAO,CAAE,CAAC,AACX,CAAC"}`
};
const ThemeToggler = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let theme = "light";
  try {
    theme = localStorage.theme;
  } catch (e) {
  }
  $$result.css.add(css$5);
  return `<button aria-label="${"Toggle theme"}" title="${"Toggle theme"}" class="${["svelte-15rngbk", ""].join(" ").trim()}">toggle theme

	<svg viewBox="${"0 0 24 24"}" class="${"svelte-15rngbk"}"><path class="${"light svelte-15rngbk"}" d="${"M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,15.31L23.31,12L20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31Z"}"></path><path class="${"dark svelte-15rngbk"}" d="${"M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"}"></path></svg>
</button>`;
});
var app = "html {\n	--bg: white;\n	--fg: #333;\n	--fg-light: #666;\n}\n\nhtml.dark {\n	--bg: #333;\n	--fg: #eee;\n	--fg-light: #aaa;\n}\n\nbody {\n	margin: 0;\n	font-family: Roboto, -apple-system, BlinkMacSystemFont, Segoe UI, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;\n	font-size: 14px;\n	line-height: 1.5;\n	background-color: var(--bg);\n	color: var(--fg);\n	transition: background-color 0.6s;\n}\n\n@media (prefers-reduced-motion: reduce) {\n	body {\n		transition: none;\n	}\n}\n\nh1, h2, h3, h4, h5, h6 {\n	margin: 0 0 0.5em 0;\n	font-weight: 400;\n	line-height: 1.2;\n}\n\nh1 {\n	font-size: 2em;\n}\n\na {\n	color: inherit;\n}\n\ncode {\n	font-family: menlo, inconsolata, monospace;\n	font-size: calc(1em - 3px);\n}\n\n@media (min-width: 400px) {\n	body {\n		font-size: 16px;\n	}\n}";
var __layout_svelte_svelte_type_style_lang = "main.svelte-12dt5ya{position:relative;max-width:56em;padding:2em;margin:0 auto;box-sizing:border-box}";
const css$4 = {
  code: "main.svelte-12dt5ya{position:relative;max-width:56em;padding:2em;margin:0 auto;box-sizing:border-box}",
  map: `{"version":3,"file":"__layout.svelte","sources":["__layout.svelte"],"sourcesContent":["<script>\\n\\timport { page, navigating } from '$app/stores';\\n\\timport Nav from '$lib/Nav.svelte';\\n\\timport PreloadingIndicator from '$lib/PreloadingIndicator.svelte';\\n\\timport ThemeToggler from '$lib/ThemeToggler.svelte';\\n\\timport '../app.css';\\n\\n\\n\\t$: section = $page.path.split('/')[1];\\n<\/script>\\n\\n<Nav {section}/>\\n\\n{#if $navigating}\\n\\t<PreloadingIndicator/>\\n{/if}\\n\\n<main>\\n\\t<slot></slot>\\n</main>\\n\\n<ThemeToggler/>\\n\\n<style>\\n\\tmain {\\n\\t\\tposition: relative;\\n\\t\\tmax-width: 56em;\\n\\t\\tpadding: 2em;\\n\\t\\tmargin: 0 auto;\\n\\t\\tbox-sizing: border-box;\\n\\t}\\n</style>\\n"],"names":[],"mappings":"AAwBC,IAAI,eAAC,CAAC,AACL,QAAQ,CAAE,QAAQ,CAClB,SAAS,CAAE,IAAI,CACf,OAAO,CAAE,GAAG,CACZ,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,UAAU,CAAE,UAAU,AACvB,CAAC"}`
};
const _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let section;
  let $page, $$unsubscribe_page;
  let $navigating, $$unsubscribe_navigating;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_navigating = subscribe(navigating, (value) => $navigating = value);
  $$result.css.add(css$4);
  section = $page.path.split("/")[1];
  $$unsubscribe_page();
  $$unsubscribe_navigating();
  return `${validate_component(Nav, "Nav").$$render($$result, { section }, {}, {})}

${$navigating ? `${validate_component(PreloadingIndicator, "PreloadingIndicator").$$render($$result, {}, {}, {})}` : ``}

<main class="${"svelte-12dt5ya"}">${slots.default ? slots.default({}) : ``}</main>

${validate_component(ThemeToggler, "ThemeToggler").$$render($$result, {}, {}, {})}`;
});
var __layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout
});
var __error_svelte_svelte_type_style_lang = "h1.svelte-8od9u6{margin:0 auto}h1.svelte-8od9u6{font-size:2.8em;font-weight:700;margin:0 0 0.5em 0}@media(min-width: 480px){h1.svelte-8od9u6{font-size:4em}}";
const css$3 = {
  code: "h1.svelte-8od9u6{margin:0 auto}h1.svelte-8od9u6{font-size:2.8em;font-weight:700;margin:0 0 0.5em 0}@media(min-width: 480px){h1.svelte-8od9u6{font-size:4em}}",
  map: `{"version":3,"file":"__error.svelte","sources":["__error.svelte"],"sourcesContent":["<script context=\\"module\\">\\n\\texport function load({ error, status }) {\\n\\t\\treturn {\\n\\t\\t\\tprops: { error, status }\\n\\t\\t};\\n\\t}\\n<\/script>\\n\\n<script>\\n\\timport { dev } from '$app/env';\\n\\n\\texport let status;\\n\\texport let error;\\n\\n\\tconst offline = typeof navigator !== 'undefined' && navigator.onLine === false;\\n\\n\\tconst title = offline ? 'Offline' : status;\\n\\tconst message = offline ? 'Find the internet and try again' : error.message;\\n<\/script>\\n\\n<svelte:head>\\n\\t<title>{title}</title>\\n</svelte:head>\\n\\n<h1>{title}</h1>\\n\\n<pre>{message}</pre>\\n\\n{#if dev && error.frame}\\n\\t<pre>{error.frame}</pre>\\n{/if}\\n{#if dev && error.stack}\\n\\t<pre>{error.stack}</pre>\\n{/if}\\n\\n<style>\\n\\th1, p {\\n\\t\\tmargin: 0 auto;\\n\\t}\\n\\n\\th1 {\\n\\t\\tfont-size: 2.8em;\\n\\t\\tfont-weight: 700;\\n\\t\\tmargin: 0 0 0.5em 0;\\n\\t}\\n\\n\\tp {\\n\\t\\tmargin: 1em auto;\\n\\t}\\n\\n\\t@media (min-width: 480px) {\\n\\t\\th1 {\\n\\t\\t\\tfont-size: 4em;\\n\\t\\t}\\n\\t}\\n</style>\\n"],"names":[],"mappings":"AAoCC,EAAE,cAAI,CAAC,AACN,MAAM,CAAE,CAAC,CAAC,IAAI,AACf,CAAC,AAED,EAAE,cAAC,CAAC,AACH,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,GAAG,CAChB,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,AACpB,CAAC,AAMD,MAAM,AAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AAC1B,EAAE,cAAC,CAAC,AACH,SAAS,CAAE,GAAG,AACf,CAAC,AACF,CAAC"}`
};
function load$4({ error: error2, status }) {
  return { props: { error: error2, status } };
}
const _error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status } = $$props;
  let { error: error2 } = $$props;
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const title = offline ? "Offline" : status;
  const message = offline ? "Find the internet and try again" : error2.message;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  $$result.css.add(css$3);
  return `${$$result.head += `${$$result.title = `<title>${escape(title)}</title>`, ""}`, ""}

<h1 class="${"svelte-8od9u6"}">${escape(title)}</h1>

<pre>${escape(message)}</pre>

${``}
${``}`;
});
var __error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _error,
  load: load$4
});
function load$3() {
  return {
    redirect: "/top/1",
    status: 301
  };
}
const Routes = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return ``;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Routes,
  load: load$3
});
const hydrate$1 = false;
const prerender = true;
const About = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `${$$result.title = `<title>About \u2022 Svelte Hacker News</title>`, ""}`, ""}

<h1>About this site</h1>

<p>This is a simple Hacker News clone, built with <a href="${"https://kit.svelte.dev"}">SvelteKit</a>, an application framework for <a href="${"https://svelte.dev"}">Svelte</a>.</p>

<p>Svelte is a new kind of framework, one that compiles your component templates into fast, compact JavaScript \u2014 either client-side or server-side. You can read more about the design and philosophy in the <a href="${"https://svelte.dev/blog/svelte-3-rethinking-reactivity"}">introductory blog post</a>.</p>

<p>We&#39;re using <a href="${"https://github.com/davideast/hnpwa-api"}">hnpwa-api</a> as a backend. The app is hosted on <a href="${"https://cloud.google.com/run/"}">Cloud Run</a>, using <a href="${"https://www.cloudflare.com/"}">Cloudflare</a> for the CDN. <a href="${"https://github.com/sveltejs/hn.svelte.dev"}">The source code is here</a>.</p>`;
});
var about = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": About,
  hydrate: hydrate$1,
  prerender
});
var _Comment_svelte_svelte_type_style_lang = ".comment.svelte-1fwtum2.svelte-1fwtum2{border-top:1px solid rgba(0,0,0,0.1)}.meta-bar.svelte-1fwtum2.svelte-1fwtum2{padding:1em 0;cursor:pointer;background:100% 50% no-repeat url(__VITE_ASSET__08edd659__);background-size:1em 1em}.hidden.svelte-1fwtum2 .meta-bar.svelte-1fwtum2{background-image:url(__VITE_ASSET__a370f815__)}.comment.svelte-1fwtum2 .children.svelte-1fwtum2{padding:0 0 0 1em;margin:0}.hidden.svelte-1fwtum2 .body.svelte-1fwtum2,.hidden.svelte-1fwtum2 .children.svelte-1fwtum2{display:none}@media(min-width: 720px){.comment.svelte-1fwtum2 .children.svelte-1fwtum2{padding:0 0 0 2em}}li.svelte-1fwtum2.svelte-1fwtum2{list-style:none}.meta.svelte-1fwtum2.svelte-1fwtum2{display:block;font-size:14px;color:var(--fg-light)}a.svelte-1fwtum2.svelte-1fwtum2{color:var(--fg-light)}.body.svelte-1fwtum2 *{overflow-wrap:break-word}.comment.svelte-1fwtum2 pre{overflow-x:auto}";
const css$2 = {
  code: ".comment.svelte-1fwtum2.svelte-1fwtum2{border-top:1px solid rgba(0,0,0,0.1)}.meta-bar.svelte-1fwtum2.svelte-1fwtum2{padding:1em 0;cursor:pointer;background:100% 50% no-repeat url(./_icons/fold.svg);background-size:1em 1em}.hidden.svelte-1fwtum2 .meta-bar.svelte-1fwtum2{background-image:url(./_icons/unfold.svg)}.comment.svelte-1fwtum2 .children.svelte-1fwtum2{padding:0 0 0 1em;margin:0}.hidden.svelte-1fwtum2 .body.svelte-1fwtum2,.hidden.svelte-1fwtum2 .children.svelte-1fwtum2{display:none}@media(min-width: 720px){.comment.svelte-1fwtum2 .children.svelte-1fwtum2{padding:0 0 0 2em}}li.svelte-1fwtum2.svelte-1fwtum2{list-style:none}.meta.svelte-1fwtum2.svelte-1fwtum2{display:block;font-size:14px;color:var(--fg-light)}a.svelte-1fwtum2.svelte-1fwtum2{color:var(--fg-light)}.body.svelte-1fwtum2 *{overflow-wrap:break-word}.comment.svelte-1fwtum2 pre{overflow-x:auto}",
  map: `{"version":3,"file":"_Comment.svelte","sources":["_Comment.svelte"],"sourcesContent":["<script>\\n\\texport let comment;\\n\\n\\tlet hidden = false;\\n<\/script>\\n\\n{#if !comment.deleted}\\n\\t<article class=\\"comment\\" class:hidden>\\n\\t\\t<div class=\\"meta-bar\\" on:click=\\"{() => hidden = !hidden}\\">\\n\\t\\t\\t<span class=\\"meta\\"><a sveltekit:prefetch href=\\"/user/{comment.user}\\">{comment.user}</a> {comment.time_ago}</span>\\n\\t\\t</div>\\n\\n\\t\\t<div class=\\"body\\">\\n\\t\\t\\t{@html comment.content}\\n\\t\\t</div>\\n\\n\\t\\t{#if comment.comments.length > 0}\\n\\t\\t\\t<ul class=\\"children\\">\\n\\t\\t\\t\\t{#each comment.comments as child}\\n\\t\\t\\t\\t\\t<li><svelte:self comment='{child}'/></li>\\n\\t\\t\\t\\t{/each}\\n\\t\\t\\t</ul>\\n\\t\\t{/if}\\n\\t</article>\\n{/if}\\n\\n<style>\\n\\t.comment {\\n\\t\\tborder-top: 1px solid rgba(0,0,0,0.1);\\n\\t}\\n\\n\\t:global(html).dark .comment {\\n\\t\\tborder-top: 1px solid rgba(255,255,255,0.1);;\\n\\t}\\n\\n\\t.meta-bar {\\n\\t\\tpadding: 1em 0;\\n\\t\\tcursor: pointer;\\n\\t\\tbackground: 100% 50% no-repeat url(./_icons/fold.svg);\\n\\t\\tbackground-size: 1em 1em;\\n\\t}\\n\\n\\t.hidden .meta-bar {\\n\\t\\tbackground-image: url(./_icons/unfold.svg);\\n\\t}\\n\\n\\t.comment .children {\\n\\t\\tpadding: 0 0 0 1em;\\n\\t\\tmargin: 0;\\n\\t}\\n\\n\\t.hidden .body, .hidden .children {\\n\\t\\tdisplay: none;\\n\\t}\\n\\n\\t@media (min-width: 720px) {\\n\\t\\t.comment .children {\\n\\t\\t\\tpadding: 0 0 0 2em;\\n\\t\\t}\\n\\t}\\n\\n\\tli {\\n\\t\\tlist-style: none;\\n\\t}\\n\\n\\t.meta {\\n\\t\\tdisplay: block;\\n\\t\\tfont-size: 14px;\\n\\t\\tcolor: var(--fg-light);\\n\\t}\\n\\n\\ta {\\n\\t\\tcolor: var(--fg-light);\\n\\t}\\n\\n\\t/* prevent crazy overflow layout bug on mobile */\\n\\t.body :global(*) {\\n\\t\\toverflow-wrap: break-word;\\n\\t}\\n\\n\\t.comment :global(pre) {\\n\\t\\toverflow-x: auto;\\n\\t}\\n</style>"],"names":[],"mappings":"AA2BC,QAAQ,8BAAC,CAAC,AACT,UAAU,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AACtC,CAAC,AAMD,SAAS,8BAAC,CAAC,AACV,OAAO,CAAE,GAAG,CAAC,CAAC,CACd,MAAM,CAAE,OAAO,CACf,UAAU,CAAE,IAAI,CAAC,GAAG,CAAC,SAAS,CAAC,IAAI,iBAAiB,CAAC,CACrD,eAAe,CAAE,GAAG,CAAC,GAAG,AACzB,CAAC,AAED,sBAAO,CAAC,SAAS,eAAC,CAAC,AAClB,gBAAgB,CAAE,IAAI,mBAAmB,CAAC,AAC3C,CAAC,AAED,uBAAQ,CAAC,SAAS,eAAC,CAAC,AACnB,OAAO,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAClB,MAAM,CAAE,CAAC,AACV,CAAC,AAED,sBAAO,CAAC,oBAAK,CAAE,sBAAO,CAAC,SAAS,eAAC,CAAC,AACjC,OAAO,CAAE,IAAI,AACd,CAAC,AAED,MAAM,AAAC,YAAY,KAAK,CAAC,AAAC,CAAC,AAC1B,uBAAQ,CAAC,SAAS,eAAC,CAAC,AACnB,OAAO,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,AACnB,CAAC,AACF,CAAC,AAED,EAAE,8BAAC,CAAC,AACH,UAAU,CAAE,IAAI,AACjB,CAAC,AAED,KAAK,8BAAC,CAAC,AACN,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,IAAI,CACf,KAAK,CAAE,IAAI,UAAU,CAAC,AACvB,CAAC,AAED,CAAC,8BAAC,CAAC,AACF,KAAK,CAAE,IAAI,UAAU,CAAC,AACvB,CAAC,AAGD,oBAAK,CAAC,AAAQ,CAAC,AAAE,CAAC,AACjB,aAAa,CAAE,UAAU,AAC1B,CAAC,AAED,uBAAQ,CAAC,AAAQ,GAAG,AAAE,CAAC,AACtB,UAAU,CAAE,IAAI,AACjB,CAAC"}`
};
const Comment = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { comment } = $$props;
  if ($$props.comment === void 0 && $$bindings.comment && comment !== void 0)
    $$bindings.comment(comment);
  $$result.css.add(css$2);
  return `${!comment.deleted ? `<article class="${["comment svelte-1fwtum2", ""].join(" ").trim()}"><div class="${"meta-bar svelte-1fwtum2"}"><span class="${"meta svelte-1fwtum2"}"><a sveltekit:prefetch href="${"/user/" + escape(comment.user)}" class="${"svelte-1fwtum2"}">${escape(comment.user)}</a> ${escape(comment.time_ago)}</span></div>

		<div class="${"body svelte-1fwtum2"}"><!-- HTML_TAG_START -->${comment.content}<!-- HTML_TAG_END --></div>

		${comment.comments.length > 0 ? `<ul class="${"children svelte-1fwtum2"}">${each(comment.comments, (child) => `<li class="${"svelte-1fwtum2"}">${validate_component(Comment, "svelte:self").$$render($$result, { comment: child }, {}, {})}</li>`)}</ul>` : ``}</article>` : ``}`;
});
var _id__svelte_svelte_type_style_lang = "h1.svelte-101ktgy{font-weight:500}.item.svelte-101ktgy{border-bottom:1em solid rgba(0,0,0,0.1);margin:0 -2em 2em -2em;padding:0 2em 2em 2em}.main-link.svelte-101ktgy{display:block;text-decoration:none}small.svelte-101ktgy{display:block;font-size:14px}.meta.svelte-101ktgy{font-size:0.8em;font-weight:300;color:var(--fg-light)}.comments.svelte-101ktgy>.comment:first-child{border-top:none}";
const css$1 = {
  code: "h1.svelte-101ktgy{font-weight:500}.item.svelte-101ktgy{border-bottom:1em solid rgba(0,0,0,0.1);margin:0 -2em 2em -2em;padding:0 2em 2em 2em}.main-link.svelte-101ktgy{display:block;text-decoration:none}small.svelte-101ktgy{display:block;font-size:14px}.meta.svelte-101ktgy{font-size:0.8em;font-weight:300;color:var(--fg-light)}.comments.svelte-101ktgy>.comment:first-child{border-top:none}",
  map: `{"version":3,"file":"[id].svelte","sources":["[id].svelte"],"sourcesContent":["<script context=\\"module\\">\\n\\texport async function load({ page, fetch }) {\\n\\t\\tconst res = await fetch(\`https://api.hnpwa.com/v0/item/\${page.params.id}.json\`);\\n\\t\\tconst item = await res.json();\\n\\n\\t\\treturn { props: { item } };\\n\\t}\\n<\/script>\\n\\n<script>\\n\\timport Comment from './_Comment.svelte';\\n\\n\\texport let item;\\n<\/script>\\n\\n<svelte:head>\\n\\t<title>{item.title} | Svelte Hacker News</title>\\n</svelte:head>\\n\\n<div>\\n\\t<article class=\\"item\\">\\n\\t\\t<a class=\\"main-link\\" href={item.url}>\\n\\t\\t\\t<h1>{item.title}</h1>\\n\\t\\t\\t{#if item.domain}<small>{item.domain}</small>{/if}\\n\\t\\t</a>\\n\\n\\t\\t<p class=\\"meta\\">{item.points} points by <a href=\\"/user/{item.user}\\">{item.user}</a> {item.time_ago}</p>\\n\\n\\t\\t{#if item.content}\\n\\t\\t\\t{@html item.content}\\n\\t\\t{/if}\\n\\t</article>\\n\\n\\t<div class=\\"comments\\">\\n\\t\\t{#each item.comments as comment}\\n\\t\\t\\t<Comment comment='{comment}'/>\\n\\t\\t{/each}\\n\\t</div>\\n</div>\\n\\n<style>\\n\\th1 {\\n\\t\\tfont-weight: 500;\\n\\t}\\n\\n\\t.item {\\n\\t\\tborder-bottom: 1em solid rgba(0,0,0,0.1);\\n\\t\\tmargin: 0 -2em 2em -2em;\\n\\t\\tpadding: 0 2em 2em 2em;\\n\\t}\\n\\n\\t:global(html).dark .item {\\n\\t\\tborder-bottom: 1em solid rgba(255,255,255,0.1);;\\n\\t}\\n\\n\\t.main-link {\\n\\t\\tdisplay: block;\\n\\t\\ttext-decoration: none;\\n\\t}\\n\\n\\tsmall {\\n\\t\\tdisplay: block;\\n\\t\\tfont-size: 14px;\\n\\t}\\n\\n\\t.meta {\\n\\t\\tfont-size: 0.8em;\\n\\t\\tfont-weight: 300;\\n\\t\\tcolor: var(--fg-light);\\n\\t}\\n\\n\\t.comments > :global(.comment):first-child {\\n\\t\\tborder-top: none;\\n\\t}\\n</style>"],"names":[],"mappings":"AAyCC,EAAE,eAAC,CAAC,AACH,WAAW,CAAE,GAAG,AACjB,CAAC,AAED,KAAK,eAAC,CAAC,AACN,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CACxC,MAAM,CAAE,CAAC,CAAC,IAAI,CAAC,GAAG,CAAC,IAAI,CACvB,OAAO,CAAE,CAAC,CAAC,GAAG,CAAC,GAAG,CAAC,GAAG,AACvB,CAAC,AAMD,UAAU,eAAC,CAAC,AACX,OAAO,CAAE,KAAK,CACd,eAAe,CAAE,IAAI,AACtB,CAAC,AAED,KAAK,eAAC,CAAC,AACN,OAAO,CAAE,KAAK,CACd,SAAS,CAAE,IAAI,AAChB,CAAC,AAED,KAAK,eAAC,CAAC,AACN,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,IAAI,UAAU,CAAC,AACvB,CAAC,AAED,wBAAS,CAAW,QAAQ,AAAC,YAAY,AAAC,CAAC,AAC1C,UAAU,CAAE,IAAI,AACjB,CAAC"}`
};
async function load$2({ page: page2, fetch: fetch2 }) {
  const res = await fetch2(`https://api.hnpwa.com/v0/item/${page2.params.id}.json`);
  const item = await res.json();
  return { props: { item } };
}
const U5Bidu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { item } = $$props;
  if ($$props.item === void 0 && $$bindings.item && item !== void 0)
    $$bindings.item(item);
  $$result.css.add(css$1);
  return `${$$result.head += `${$$result.title = `<title>${escape(item.title)} | Svelte Hacker News</title>`, ""}`, ""}

<div><article class="${"item svelte-101ktgy"}"><a class="${"main-link svelte-101ktgy"}"${add_attribute("href", item.url, 0)}><h1 class="${"svelte-101ktgy"}">${escape(item.title)}</h1>
			${item.domain ? `<small class="${"svelte-101ktgy"}">${escape(item.domain)}</small>` : ``}</a>

		<p class="${"meta svelte-101ktgy"}">${escape(item.points)} points by <a href="${"/user/" + escape(item.user)}">${escape(item.user)}</a> ${escape(item.time_ago)}</p>

		${item.content ? `<!-- HTML_TAG_START -->${item.content}<!-- HTML_TAG_END -->` : ``}</article>

	<div class="${"comments svelte-101ktgy"}">${each(item.comments, (comment) => `${validate_component(Comment, "Comment").$$render($$result, { comment }, {}, {})}`)}</div>
</div>`;
});
var _id_ = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": U5Bidu5D,
  load: load$2
});
const hydrate = false;
async function load$1({ page: page2, fetch: fetch2 }) {
  const res = await fetch2(`https://api.hnpwa.com/v0/user/${page2.params.name}.json`);
  const user = await res.json();
  return { props: { name: page2.params.name, user } };
}
const U5Bnameu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const d2 = new Date();
  new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  let { name } = $$props;
  let { user } = $$props;
  if ($$props.name === void 0 && $$bindings.name && name !== void 0)
    $$bindings.name(name);
  if ($$props.user === void 0 && $$bindings.user && user !== void 0)
    $$bindings.user(user);
  return `${$$result.head += `${$$result.title = `<title>${escape(name)} \u2022 Svelte Hacker News</title>`, ""}`, ""}

<h1>${escape(name)}</h1>

<div><p>...joined <strong>${escape(user.created)}</strong>, and has <strong>${escape(user.karma)}</strong> karma</p>

	<p><a href="${"https://news.ycombinator.com/submitted?id=" + escape(user.id)}">submissions</a> /
		<a href="${"https://news.ycombinator.com/threads?id=" + escape(user.id)}">comments</a> /
		<a href="${"https://news.ycombinator.com/favorites?id=" + escape(user.id)}">favourites</a></p>

	${user.about ? `<div class="${"about"}"><!-- HTML_TAG_START -->${"<p>" + user.about}<!-- HTML_TAG_END --></div>` : ``}</div>`;
});
var _name_ = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": U5Bnameu5D,
  hydrate,
  load: load$1
});
var _ItemSummary_svelte_svelte_type_style_lang = "article.svelte-k6yna4.svelte-k6yna4{position:relative;padding:0 0 0 4em;margin:0 0 1.5em 0}h2.svelte-k6yna4.svelte-k6yna4{font-size:1em;font-weight:500;margin:0 0 0.5em 0;color:var(--fg)}h2.svelte-k6yna4 a.svelte-k6yna4{text-decoration:none}p.svelte-k6yna4.svelte-k6yna4{font-size:0.8em;color:var(--fg-light);margin:0;font-weight:300}small.svelte-k6yna4.svelte-k6yna4{color:var(--fg-light);font-weight:300}.index.svelte-k6yna4.svelte-k6yna4{position:absolute;font-size:1.6em;font-weight:200;color:var(--fg-light);left:0.2em;top:0;text-align:right;width:0.75em;line-height:1}";
const css = {
  code: "article.svelte-k6yna4.svelte-k6yna4{position:relative;padding:0 0 0 4em;margin:0 0 1.5em 0}h2.svelte-k6yna4.svelte-k6yna4{font-size:1em;font-weight:500;margin:0 0 0.5em 0;color:var(--fg)}h2.svelte-k6yna4 a.svelte-k6yna4{text-decoration:none}p.svelte-k6yna4.svelte-k6yna4{font-size:0.8em;color:var(--fg-light);margin:0;font-weight:300}small.svelte-k6yna4.svelte-k6yna4{color:var(--fg-light);font-weight:300}.index.svelte-k6yna4.svelte-k6yna4{position:absolute;font-size:1.6em;font-weight:200;color:var(--fg-light);left:0.2em;top:0;text-align:right;width:0.75em;line-height:1}",
  map: `{"version":3,"file":"_ItemSummary.svelte","sources":["_ItemSummary.svelte"],"sourcesContent":["<script>\\n\\texport let item;\\n\\texport let index;\\n<\/script>\\n\\n<article>\\n\\t<h2>\\n\\t\\t<a href={item.domain ? item.url : \`/item/\${item.id}\`}>{item.title} {#if item.domain}<small>({item.domain})</small>{/if}</a>\\n\\t</h2>\\n\\n\\t{#if item.type === 'job'}\\n\\t\\t<p>{item.time_ago}</p>\\n\\t{:else}\\n\\t\\t<p>\\n\\t\\t\\t{item.points} points by\\n\\t\\t\\t<a sveltekit:prefetch href=\\"/user/{item.user}\\">{item.user}</a> {item.time_ago}\\n\\t\\t\\t | <a sveltekit:prefetch href=\\"/item/{item.id}\\">{item.comments_count} {item.comments_count === 1 ? 'comment' : 'comments'}</a>\\n\\t\\t</p>\\n\\t{/if}\\n\\n\\t<span class=\\"index\\">{index}</span>\\n</article>\\n\\n<style>\\n\\tarticle {\\n\\t\\tposition: relative;\\n\\t\\tpadding: 0 0 0 4em;\\n\\t\\tmargin: 0 0 1.5em 0;\\n\\t}\\n\\n\\th2 {\\n\\t\\tfont-size: 1em;\\n\\t\\tfont-weight: 500;\\n\\t\\tmargin: 0 0 0.5em 0;\\n\\t\\tcolor: var(--fg);\\n\\t}\\n\\n\\th2 a {\\n\\t\\ttext-decoration: none;\\n\\t}\\n\\n\\tp {\\n\\t\\tfont-size: 0.8em;\\n\\t\\tcolor: var(--fg-light);\\n\\t\\tmargin: 0;\\n\\t\\tfont-weight: 300;\\n\\t}\\n\\n\\tsmall {\\n\\t\\tcolor: var(--fg-light);\\n\\t\\tfont-weight: 300;\\n\\t}\\n\\n\\t.index {\\n\\t\\tposition: absolute;\\n\\t\\tfont-size: 1.6em;\\n\\t\\tfont-weight: 200;\\n\\t\\tcolor: var(--fg-light);\\n\\t\\tleft: 0.2em;\\n\\t\\ttop: 0;\\n\\t\\ttext-align: right;\\n\\t\\twidth: 0.75em;\\n\\t\\tline-height: 1;\\n\\t}\\n</style>"],"names":[],"mappings":"AAwBC,OAAO,4BAAC,CAAC,AACR,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAClB,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,AACpB,CAAC,AAED,EAAE,4BAAC,CAAC,AACH,SAAS,CAAE,GAAG,CACd,WAAW,CAAE,GAAG,CAChB,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,CACnB,KAAK,CAAE,IAAI,IAAI,CAAC,AACjB,CAAC,AAED,gBAAE,CAAC,CAAC,cAAC,CAAC,AACL,eAAe,CAAE,IAAI,AACtB,CAAC,AAED,CAAC,4BAAC,CAAC,AACF,SAAS,CAAE,KAAK,CAChB,KAAK,CAAE,IAAI,UAAU,CAAC,CACtB,MAAM,CAAE,CAAC,CACT,WAAW,CAAE,GAAG,AACjB,CAAC,AAED,KAAK,4BAAC,CAAC,AACN,KAAK,CAAE,IAAI,UAAU,CAAC,CACtB,WAAW,CAAE,GAAG,AACjB,CAAC,AAED,MAAM,4BAAC,CAAC,AACP,QAAQ,CAAE,QAAQ,CAClB,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,IAAI,UAAU,CAAC,CACtB,IAAI,CAAE,KAAK,CACX,GAAG,CAAE,CAAC,CACN,UAAU,CAAE,KAAK,CACjB,KAAK,CAAE,MAAM,CACb,WAAW,CAAE,CAAC,AACf,CAAC"}`
};
const ItemSummary = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { item } = $$props;
  let { index: index2 } = $$props;
  if ($$props.item === void 0 && $$bindings.item && item !== void 0)
    $$bindings.item(item);
  if ($$props.index === void 0 && $$bindings.index && index2 !== void 0)
    $$bindings.index(index2);
  $$result.css.add(css);
  return `<article class="${"svelte-k6yna4"}"><h2 class="${"svelte-k6yna4"}"><a${add_attribute("href", item.domain ? item.url : `/item/${item.id}`, 0)} class="${"svelte-k6yna4"}">${escape(item.title)} ${item.domain ? `<small class="${"svelte-k6yna4"}">(${escape(item.domain)})</small>` : ``}</a></h2>

	${item.type === "job" ? `<p class="${"svelte-k6yna4"}">${escape(item.time_ago)}</p>` : `<p class="${"svelte-k6yna4"}">${escape(item.points)} points by
			<a sveltekit:prefetch href="${"/user/" + escape(item.user)}">${escape(item.user)}</a> ${escape(item.time_ago)}
			 | <a sveltekit:prefetch href="${"/item/" + escape(item.id)}">${escape(item.comments_count)} ${escape(item.comments_count === 1 ? "comment" : "comments")}</a></p>`}

	<span class="${"index svelte-k6yna4"}">${escape(index2)}</span>
</article>`;
});
const valid_lists = new Set(["news", "newest", "show", "ask", "jobs"]);
async function load({ page: { params }, fetch: fetch2 }) {
  const list = params.list === "top" ? "news" : params.list === "new" ? "newest" : params.list;
  if (!valid_lists.has(list)) {
    console.log(`invalid list parameter ${list}`);
    return { status: 404, error: "Not found" };
  }
  const page2 = +params.page;
  const res = await fetch2(`https://api.hnpwa.com/v0/${list}/${page2}.json`);
  const items = await res.json();
  return { props: { page: page2, list, items } };
}
const PAGE_SIZE = 30;
const U5Bpageu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let start;
  let next;
  let { page: page2 } = $$props;
  let { list } = $$props;
  let { items } = $$props;
  if ($$props.page === void 0 && $$bindings.page && page2 !== void 0)
    $$bindings.page(page2);
  if ($$props.list === void 0 && $$bindings.list && list !== void 0)
    $$bindings.list(list);
  if ($$props.items === void 0 && $$bindings.items && items !== void 0)
    $$bindings.items(items);
  start = 1 + (page2 - 1) * PAGE_SIZE;
  next = `/${list}/${+page2 + 1}`;
  return `${$$result.head += `${$$result.title = `<title>Svelte Hacker News</title>`, ""}<meta name="${"description"}" content="${"Latest Hacker News stories in the " + escape(list) + " category"}" data-svelte="svelte-1ibktji">`, ""}

${each(items, (item, i) => `${item ? `
		${validate_component(ItemSummary, "ItemSummary").$$render($$result, { item, index: start + i }, {}, {})}` : ``}`)}

${next ? `<a class="${"more"}"${add_attribute("href", next, 0)}>More...</a>` : ``}`;
});
var _page_ = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": U5Bpageu5D,
  load
});
export { init, render$1 as render };
