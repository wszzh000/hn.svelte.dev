const c = [
	() => import("../../../src/routes/__layout.svelte"),
	() => import("../../../src/routes/__error.svelte"),
	() => import("../../../src/routes/index.svelte"),
	() => import("../../../src/routes/about.svelte"),
	() => import("../../../src/routes/item/[id].svelte"),
	() => import("../../../src/routes/user/[name].svelte"),
	() => import("../../../src/routes/[list]/[page].svelte")
];

const d = decodeURIComponent;

export const routes = [
	// src/routes/index.svelte
	[/^\/$/, [c[0], c[2]], [c[1]]],

	// src/routes/about.svelte
	[/^\/about\/?$/, [c[0], c[3]], [c[1]]],

	// src/routes/item/[id].svelte
	[/^\/item\/([^/]+?)\/?$/, [c[0], c[4]], [c[1]], (m) => ({ id: d(m[1])})],

	// src/routes/user/[name].svelte
	[/^\/user\/([^/]+?)\/?$/, [c[0], c[5]], [c[1]], (m) => ({ name: d(m[1])})],

	// src/routes/rss.js
	[/^\/rss\/?$/],

	// src/routes/[list]/rss.js
	[/^\/([^/]+?)\/rss\/?$/],

	// src/routes/[list]/[page].svelte
	[/^\/([^/]+?)\/([^/]+?)\/?$/, [c[0], c[6]], [c[1]], (m) => ({ list: d(m[1]), page: d(m[2])})]
];

// we import the root layout/error components eagerly, so that
// connectivity errors after initialisation don't nuke the app
export const fallback = [c[0](), c[1]()];