import { defaultSettings } from '../src/data/config.js';
import axios from 'axios';
import { createWriteStream } from 'node:fs';
import * as stream from 'node:stream';
import { promisify } from 'node:util';
import fs from 'node:fs';
import { responseInterceptor } from '../src/scripts/retry-axios.js';

const resourcePath = 'quote/resources/mod-form/form';
const axiosInstance = axios.create();
const helpersAxiosInstance = axios.create();
responseInterceptor(axiosInstance);
responseInterceptor(helpersAxiosInstance);

// helper to allow us to define an "end" event to multiple streams
const streamToDestination = (destPath, fileName) => {
	if (!fileName) {
		return false;
	}

	const finished = promisify(stream.finished);
	const url = `https://${defaultSettings.nodeEnv}/${resourcePath}/${fileName}`;

	return new Promise(resolve => {
		const folderPath = `${defaultSettings.publicFolder}/${destPath}`;

		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath, { recursive: true });
		}

		// if file exists, do not create it again
		if (fs.existsSync(`${folderPath}/${fileName}`)) {
			resolve();
		} else {
			const writer = createWriteStream(`${folderPath}/${fileName}`)
			const options = {
				url,
				method: 'get',
				responseType: 'stream'
			};

			axiosInstance(options).then(resp => {
				if (resp.status !== 200) {
					throw new Error(`${resp.status}: Error while fetching ${url}`);
				}
				resp.data.pipe(writer);
				console.log(`${destPath}/${fileName} created...`);
				return finished(writer);
			}).then(() => {
				resolve();
			}).catch(error => {
				console.error(error);
				process.exit(1);
			}).finally(() => {
				axiosInstance.interceptors.response.eject(responseInterceptor);
			});
		}
	});
}

async function getHelpers() {
	let helpers = [];
	await new Promise(resolve => {
		const options = {
			url: `https://${defaultSettings.nodeEnv}/${resourcePath}/chunks.txt`,
			method: 'get'
		}

		helpersAxiosInstance(options).then(resp => {
			if (resp.status !== 200) {
				throw new Error(`${resp.status}: Error while fetching ${options.url}`);
			}
			helpers = resp.data.split('\n');
			resolve();
		}).then(() => {
			resolve();
		}).catch(error => {
			console.error(error);
			resolve();
		}).finally(() => {
			helpersAxiosInstance.interceptors.response.eject(responseInterceptor);
		});
	});

	return helpers;
}

export default async function() {
	const { nodeEnv } = defaultSettings;
	const helpers = await getHelpers(defaultSettings);

	if (!nodeEnv) {
		throw new Error('Missing environment variables. Did you start with gulp instead of npm run...?');
	}
	const destinationPath = '/resources/scripts/helpers/';
	const filesPromiseMap = helpers.map(async helper => {
		const fileName = helper;
		if (fs.existsSync(`${defaultSettings.publicFolder}/${destinationPath}/${fileName}`)) {
			return;
		}
		await streamToDestination(destinationPath, fileName);
	});

	await Promise.all(filesPromiseMap);
}
