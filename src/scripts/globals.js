import { updateFooterLinkPaths } from './default/update-link-paths.js';
import { preventRageClicks } from './default/rage-clicking.js';

function globalFunctions(config) {
	// ...
	updateFooterLinkPaths(config);
}

export { globalFunctions, preventRageClicks };
