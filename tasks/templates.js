import axios from 'axios';
import footer from '../src/data/footer.js';
import fs from 'node:fs';
import merge from 'lodash.merge';
import { responseInterceptor } from '../src/scripts/retry-axios.js';

import { defaultSettings } from '../src/data/config.js';

const axiosInstance = axios.create();
const tcpaAxiosInstance = axios.create();
responseInterceptor(axiosInstance);
responseInterceptor(tcpaAxiosInstance);

function mergeDefaultFormFieldConfig(defaultConfig, config) {
	const { steps } = config;

	if (!steps.items) {
		console.error('No items[ ] found in steps{}!');
		return steps;
	}

	if (config.useAccessibleConfig) {
		steps.items.forEach(item => {
			if (item.stepContent.fields) {
				item.stepContent.fields = item.stepContent.fields.map(field => {
					if (field.attributes && field.attributes.name && defaultConfig[field.attributes.name]) {
						field = merge(defaultConfig[field.attributes.name], field);
					}
					return field;
				});
			}
		});
	} else {
		steps.items.forEach(item => {
			if (item.fields) {
				item.fields = item.fields.map(field => {
					if (field.name && defaultConfig[field.name]) {
						field = Object.assign(defaultConfig[field.name], field);
					}
					return field;
				});
			}
		});
	}

	return steps;
}

const getDefaultFormFieldConfig = async (config, folder = 'accessible-components') => {
	console.log('Starting fetch-default-form-config: ');

	await new Promise((resolve) => {
		axiosInstance.get(`https://${defaultSettings.nodeEnv}/quote/resources/mod-site/${folder}/steps/defaultFormFieldConfig.json`)
			.then(async resp => {
				if (resp.status !== 200) {
					throw new Error(`${resp.status}:  Error while fetching ${folder}/defaultFormFieldConfig.json`);
				}
				const defaultConfig = resp.data;
				if (config.steps) {
					config.steps = await mergeDefaultFormFieldConfig(defaultConfig, config);
				}
				resolve();
			}).catch(error => {
				console.error(error);
				process.exit(1);
			}).finally(() => {
				axiosInstance.interceptors.response.eject(responseInterceptor);
			});
	});
};

export default async function(config) {
	const { isLocal, nodeEnv, buildPath } = defaultSettings;
	const { isWhiteLabel } = config;
	const assetsPath = isWhiteLabel ? '' : (isLocal ? '/temp/assets' : `https://${nodeEnv}/quote/resources/assets`);
	const tempConfigCreated = fs.existsSync(`${defaultSettings.srcFolder}/${defaultSettings.tmpFolder}/config.json`);

	let tempConfig = {
		...config,
		...footer(config),
		...{ isLocal, nodeEnv, assetsPath, buildPath },
	};

	if (Object.keys(config).length > 0) {
		if (!config.doNotUseDefaultFieldConfig && !tempConfigCreated) {
			if (config.useAccessibleConfig) {
				await getDefaultFormFieldConfig(config, 'accessible-components');
			} else {
				await getDefaultFormFieldConfig(config, 'shared-components');
			}
		}
	}

	if (!tempConfigCreated) {
		if (!fs.existsSync(`${defaultSettings.srcFolder}/${defaultSettings.tmpFolder}`)) {
			fs.mkdirSync(`${defaultSettings.srcFolder}/${defaultSettings.tmpFolder}`, { recursive: true });
		}

		fs.writeFileSync(`${defaultSettings.srcFolder}/${defaultSettings.tmpFolder}/config.json`, JSON.stringify(tempConfig, null, 2));
	}
}