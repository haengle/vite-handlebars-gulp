import addEditorConfig from './add-editorconfig.js';
import grabSharedComponents from './grab-shared-components.js';
import grabSharedScripts from './grab-shared-scripts.js';
import grabCdn from './grab-cdn.js';
import grabFormHelpers from './grab-form-helpers.js';
import templates from './templates.js';
import { createStylelintFile, updateConfig } from '../src/scripts/plugins.js';

export async function startModBuild(config) {
	addEditorConfig();
	createStylelintFile();
	await grabCdn(config);
	await Promise.all([
		grabSharedComponents(config),
		grabFormHelpers(config),
		templates(config)
	]).then(async () => {
		await grabSharedScripts(config);
	});
	await updateConfig(config);
}
