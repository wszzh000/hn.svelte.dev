import { respond } from '@sveltejs/kit/ssr';
import root from './generated/root.svelte';
import { set_paths, assets } from './runtime/paths.js';
import { set_prerendering } from './runtime/env.js';
import * as user_hooks from "./hooks.js";

const template = ({ head, body }) => "<!doctype html>\n<html lang=\"en\">\n\n<head>\n\t<meta charset=\"utf-8\">\n\t<meta name=\"viewport\" content=\"width=device-width\">\n\t<meta name=\"theme-color\" content=\"#333333\">\n\n\t<script>\n\t\ttry {\n\t\t\tif (!('theme' in localStorage)) {\n\t\t\t\tlocalStorage.theme = window.matchMedia('(prefers-color-scheme: dark)').matches\n\t\t\t\t\t? 'dark'\n\t\t\t\t\t: 'light';\n\t\t\t}\n\n\t\t\tdocument.querySelector('html').classList.add(localStorage.theme);\n\t\t} catch (e) {\n\t\t\tconsole.error(e);\n\t\t}\n\t</script>\n\n\t<link rel=\"manifest\" href=\"/manifest.json\">\n\t<link rel=\"icon\" type=\"image/png\" href=\"/favicon.png\">\n\n\t" + head + "\n</head>\n\n<body>\n\t<div id=\"svelte\">" + body + "</div>\n</body>\n\n</html>\n";

let options = null;

const default_settings = { paths: {"base":"","assets":""} };

// allow paths to be overridden in svelte-kit preview
// and in prerendering
export function init(settings = default_settings) {
	set_paths(settings.paths);
	set_prerendering(settings.prerendering || false);

	const hooks = get_hooks(user_hooks);

	options = {
		amp: false,
		dev: false,
		entry: {
			file: assets + "/_app/start-3556cbdb.js",
			css: [assets + "/_app/assets/start-61d1577b.css"],
			js: [assets + "/_app/start-3556cbdb.js",assets + "/_app/chunks/vendor-67bd6b47.js"]
		},
		fetched: undefined,
		floc: false,
		get_component_path: id => assets + "/_app/" + entry_lookup[id],
		get_stack: error => String(error), // for security
		handle_error: (error, request) => {
			hooks.handleError({ error, request });
			error.stack = options.get_stack(error);
		},
		hooks,
		hydrate: true,
		initiator: undefined,
		load_component,
		manifest,
		paths: settings.paths,
		prerender: true,
		read: settings.read,
		root,
		service_worker: null,
		router: true,
		ssr: true,
		target: "#svelte",
		template,
		trailing_slash: "never"
	};
}

// input has already been decoded by decodeURI
// now handle the rest that decodeURIComponent would do
const d = s => s
	.replace(/%23/g, '#')
	.replace(/%3[Bb]/g, ';')
	.replace(/%2[Cc]/g, ',')
	.replace(/%2[Ff]/g, '/')
	.replace(/%3[Ff]/g, '?')
	.replace(/%3[Aa]/g, ':')
	.replace(/%40/g, '@')
	.replace(/%26/g, '&')
	.replace(/%3[Dd]/g, '=')
	.replace(/%2[Bb]/g, '+')
	.replace(/%24/g, '$');

const empty = () => ({});

const manifest = {
	assets: [{"file":"favicon.png","size":3210,"type":"image/png"},{"file":"logo-192.png","size":4918,"type":"image/png"},{"file":"logo-512.png","size":14047,"type":"image/png"},{"file":"manifest.json","size":352,"type":"application/json"},{"file":"robots.txt","size":25,"type":"text/plain"}],
	layout: "src/routes/__layout.svelte",
	error: "src/routes/__error.svelte",
	routes: [
		{
						type: 'page',
						pattern: /^\/$/,
						params: empty,
						a: ["src/routes/__layout.svelte", "src/routes/index.svelte"],
						b: ["src/routes/__error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/about\/?$/,
						params: empty,
						a: ["src/routes/__layout.svelte", "src/routes/about.svelte"],
						b: ["src/routes/__error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/item\/([^/]+?)\/?$/,
						params: (m) => ({ id: d(m[1])}),
						a: ["src/routes/__layout.svelte", "src/routes/item/[id].svelte"],
						b: ["src/routes/__error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/user\/([^/]+?)\/?$/,
						params: (m) => ({ name: d(m[1])}),
						a: ["src/routes/__layout.svelte", "src/routes/user/[name].svelte"],
						b: ["src/routes/__error.svelte"]
					},
		{
						type: 'endpoint',
						pattern: /^\/rss\/?$/,
						params: empty,
						load: () => import("../../src/routes/rss.js")
					},
		{
						type: 'endpoint',
						pattern: /^\/([^/]+?)\/rss\/?$/,
						params: (m) => ({ list: d(m[1])}),
						load: () => import("../../src/routes/[list]/rss.js")
					},
		{
						type: 'page',
						pattern: /^\/([^/]+?)\/([^/]+?)\/?$/,
						params: (m) => ({ list: d(m[1]), page: d(m[2])}),
						a: ["src/routes/__layout.svelte", "src/routes/[list]/[page].svelte"],
						b: ["src/routes/__error.svelte"]
					}
	]
};

// this looks redundant, but the indirection allows us to access
// named imports without triggering Rollup's missing import detection
const get_hooks = hooks => ({
	getSession: hooks.getSession || (() => ({})),
	handle: hooks.handle || (({ request, resolve }) => resolve(request)),
	handleError: hooks.handleError || (({ error }) => console.error(error.stack)),
	externalFetch: hooks.externalFetch || fetch
});

const module_lookup = {
	"src/routes/__layout.svelte": () => import("../../src/routes/__layout.svelte"),"src/routes/__error.svelte": () => import("../../src/routes/__error.svelte"),"src/routes/index.svelte": () => import("../../src/routes/index.svelte"),"src/routes/about.svelte": () => import("../../src/routes/about.svelte"),"src/routes/item/[id].svelte": () => import("../../src/routes/item/[id].svelte"),"src/routes/user/[name].svelte": () => import("../../src/routes/user/[name].svelte"),"src/routes/[list]/[page].svelte": () => import("../../src/routes/[list]/[page].svelte")
};

const metadata_lookup = {"src/routes/__layout.svelte":{"entry":"pages/__layout.svelte-5e7b9f95.js","css":["assets/pages/__layout.svelte-8e782774.css"],"js":["pages/__layout.svelte-5e7b9f95.js","chunks/vendor-67bd6b47.js"],"styles":[]},"src/routes/__error.svelte":{"entry":"pages/__error.svelte-4e033f32.js","css":["assets/pages/__error.svelte-66d11879.css"],"js":["pages/__error.svelte-4e033f32.js","chunks/vendor-67bd6b47.js"],"styles":[]},"src/routes/index.svelte":{"entry":"pages/index.svelte-0de9c966.js","css":[],"js":["pages/index.svelte-0de9c966.js","chunks/vendor-67bd6b47.js"],"styles":[]},"src/routes/about.svelte":{"entry":"pages/about.svelte-eb89ca99.js","css":[],"js":["pages/about.svelte-eb89ca99.js","chunks/vendor-67bd6b47.js"],"styles":[]},"src/routes/item/[id].svelte":{"entry":"pages/item/[id].svelte-0cdcb721.js","css":["assets/pages/item/[id].svelte-49e2747f.css"],"js":["pages/item/[id].svelte-0cdcb721.js","chunks/vendor-67bd6b47.js"],"styles":[]},"src/routes/user/[name].svelte":{"entry":"pages/user/[name].svelte-611a9876.js","css":[],"js":["pages/user/[name].svelte-611a9876.js","chunks/vendor-67bd6b47.js"],"styles":[]},"src/routes/[list]/[page].svelte":{"entry":"pages/[list]/[page].svelte-eaed3eed.js","css":["assets/pages/[list]/[page].svelte-d37502c6.css"],"js":["pages/[list]/[page].svelte-eaed3eed.js","chunks/vendor-67bd6b47.js"],"styles":[]}};

async function load_component(file) {
	const { entry, css, js, styles } = metadata_lookup[file];
	return {
		module: await module_lookup[file](),
		entry: assets + "/_app/" + entry,
		css: css.map(dep => assets + "/_app/" + dep),
		js: js.map(dep => assets + "/_app/" + dep),
		styles
	};
}

export function render(request, {
	prerender
} = {}) {
	const host = request.headers["host"];
	return respond({ ...request, host }, options, { prerender });
}