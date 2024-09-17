import fs from "node:fs";
import merge from "lodash.merge";
import gulpHandlebarsFileInclude from "gulp-handlebars-file-include";
import { defaultSettings } from "../data/config.js";
import footer from '../data/footer.js';
import { handlebarsHelpers } from "./utils.js";

export const STATIC_COPY_TARGETS = [
	{
		src: './src/resources/templates',
		dest: './resources/'
	},
	{
		src: './src/fonts',
		dest: './'
	},
	{
		src: './src/videos',
		dest: './'
	},
	{
		src: './src/accessible-components/carousel/carousel.min.js',
		dest: './accessible-components/carousel'
	},
	{
		src: './src/accessible-components/expand-collapse/expand-collapse.min.js',
		dest: './accessible-components/expand-collapse'
	},
	{
		src: './src/accessible-components/progress-bar/progress-bar.min.js',
		dest: './accessible-components/progress-bar'
	},
];

export const updateConfig = async (config) => {
	const { isLocal, nodeEnv, buildPath } = defaultSettings;
	// eslint-disable-next-line no-unused-vars
	let tempConfigExists;

	let mergedConfig = { 
		...config,
		...footer(config),
		...{ isLocal, nodeEnv, buildPath }
	};

	const checkForTempConfig = () => {
		return new Promise((resolve) => {
			tempConfigExists = fs.existsSync(`src/.tmp/config.json`);
	
			const configData = fs.readFileSync('src/.tmp/config.json', 'utf8');
			const parsedConfig = JSON.parse(configData);
			mergedConfig = merge(parsedConfig, mergedConfig);

			resolve();
		});
	};

	return {
		name: 'update-config',
		async configResolved({ configFileDependencies }) {
			await checkForTempConfig();

			configFileDependencies.forEach((file) => {
				if (file.endsWith('siteconfig.js') || file.endsWith('template.js')) {
					console.log('siteconfig or template changed');
					try {
						// overwrite the config file with new data
						fs.writeFileSync('src/.tmp/config.json', JSON.stringify(mergedConfig, null, 2));
					} catch (error) {
						console.error(`Error reading config file: ${error}`);
					}
				}
			});
		},
		configureServer() {
			gulpHandlebarsFileInclude(mergedConfig, { handlebarsHelpers, maxRecursion: 500 });
		},
		buildStart() {
			gulpHandlebarsFileInclude(mergedConfig, { handlebarsHelpers, maxRecursion: 500 });
		}
	}
}

export const updateHandlebarsOnWatch = async (config) => {
	const { isLocal, nodeEnv, buildPath } = defaultSettings;
	// eslint-disable-next-line no-unused-vars
	let tempConfigExists;

	let mergedConfig = { 
		...config,
		...footer(config),
		...{ isLocal, nodeEnv, buildPath }
	};

	const checkForTempConfig = () => {
		return new Promise((resolve) => {
			tempConfigExists = fs.existsSync(`src/.tmp/config.json`);
	
			const configData = fs.readFileSync('src/.tmp/config.json', 'utf8');
			const parsedConfig = JSON.parse(configData);
			mergedConfig = merge(parsedConfig, mergedConfig);

			resolve();
		});
	};

	return {
		name: 'update-handlebars-reload',
		enforce: 'pre',
		async configResolved({ configFileDependencies }) {
			await checkForTempConfig();

			configFileDependencies.forEach((file) => {
				if (file.endsWith('siteconfig.js') || file.endsWith('template.js')) {
					console.log('siteconfig or template changed');
					try {
						// overwrite the config file with new data
						fs.writeFileSync('src/.tmp/config.json', JSON.stringify(mergedConfig, null, 2));
					} catch (error) {
						console.error(`Error reading config file: ${error}`);
					}
				}
			});
		},
		async handleHotUpdate({ server, file }) {
			if (file.endsWith('.hbs') || file.endsWith('.html')) {
				server.ws.send({
					type: 'full-reload',
					path: '*'
				});
			}
		},
		transformIndexHtml: () => {
			gulpHandlebarsFileInclude(mergedConfig, { maxRecursion: 500 });
		}
	}
}

export const createStylelintFile = () => {
	const stylelintConfig = `extends:
  ./node_modules/mod-build/.stylelintrc.json`;

	if (!fs.existsSync('.stylelintrc.yml')) {
		fs.writeFileSync('.stylelintrc.yml', stylelintConfig);
	}
}