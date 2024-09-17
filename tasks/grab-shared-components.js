import { defaultSettings } from '../src/data/config.js'
import axios from 'axios';
import { createWriteStream } from 'node:fs';
import * as stream from 'node:stream';
import { promisify } from 'node:util';
import fs from 'node:fs';
import { responseInterceptor } from '../src/scripts/retry-axios.js';

const resourcePath = 'quote/resources/mod-site';

const axiosInstance = axios.create();
responseInterceptor(axiosInstance);

const streamSharedCompsToDestination = (defaultSettings, folder, fileName) => {
	const finished = promisify(stream.finished);

	return new Promise(resolve => {
		const folderPath = `${defaultSettings.srcFolder}/${folder}`;
		const componentFolderPath = fileName.split('/')[0];

		if (!fs.existsSync(`${folderPath}/${componentFolderPath}`)) {
			fs.mkdirSync(`${folderPath}/${componentFolderPath}`, { recursive: true });
		}

		// if file exists, do not create it again
		if (fs.existsSync(`${folderPath}/${fileName}`)) {
			resolve();
		} else {
			const writer = createWriteStream(`${folderPath}/${fileName}`)
			const options = {
				url: `https://${defaultSettings.nodeEnv}/${resourcePath}/${folder}/${fileName}`,
				method: 'get',
				responseType: 'stream'
			};

			axios(options).then(resp => {
				if (resp.status !== 200) {
					throw new Error(`${resp.status}: Error while fetching ${options.url}`);
				}
				console.log(`${folderPath}/${fileName} created...`);
				resp.data.pipe(writer);
				return finished(writer);
			}).then(() => {
				resolve();
			}).catch(error => {
				console.error(error);
				resolve();
			});
		}
	});
}

const getListOfSharedComponents = (defaultSettings, componentFolders) => {
	return componentFolders.map(folder => {
		const folderPath = `${defaultSettings.srcFolder}/${folder}`;
		if (fs.existsSync(`${folderPath}/`)) {
			return;
		}

		return new Promise(resolve => {
			axiosInstance.get(`https://${defaultSettings.nodeEnv}/${resourcePath}/${folder}/all.json`)
				.then(resp => {
					if (resp.status !== 200) {
						throw new Error(`${resp.status}: Error while fetching ${folder}/all.json`);
					}
					const listOfComponents = resp.data;
					const componentPromises = listOfComponents.map(resource => {
						return streamSharedCompsToDestination(defaultSettings, folder, `${resource}`);
					});

					resolve(Promise.all(componentPromises));
				})
				.catch(err => {
					console.log(defaultSettings.nodeEnv);
					throw new Error(`Error while fetching ${folder}/all.json: ${err.message}`);
				})
				.finally(() => {
					axiosInstance.interceptors.response.eject(responseInterceptor);
				});
		});
	});
}

export default function(config) {
	const componentFolders = config.useAccessibleConfig ? ['accessible-components'] : ['shared-components'];
	getListOfSharedComponents(defaultSettings, componentFolders);
}
