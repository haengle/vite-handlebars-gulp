import { defaultSettings } from '../src/data/config.js';
import axios from 'axios';
import { createWriteStream } from 'node:fs';
import * as stream from 'node:stream';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { responseInterceptor } from '../src/scripts/retry-axios.js';

const axiosInstance = axios.create();
responseInterceptor(axiosInstance);

async function duplicateHtmlFilestoHbs(externalResources) {
	for (const inputPath in externalResources) {
		const [destPath, fileName] = externalResources[inputPath];
		const fileExtension = path.extname(fileName);

		if (fileExtension === '.html') {
			const newFileName = fileName.replace('.html', '.hbs');
			const sourceFilePath = path.join(destPath, fileName);
			const destinationFilePath = path.join(destPath, newFileName);

			if (fs.existsSync(sourceFilePath) && !fs.existsSync(destinationFilePath)) {
				fs.copyFileSync(sourceFilePath, destinationFilePath);
				console.log(`${sourceFilePath} duplicated as ${destinationFilePath}`);
			}
		}
	}
}

function streamToDestination(inputPath, destPath, fileName) {
	const finished = promisify(stream.finished);
	const url = `https://${defaultSettings.nodeEnv}${inputPath}`;

	return new Promise(resolve => {
		if (!fs.existsSync(`${destPath}`)) {
			fs.mkdirSync(`${destPath}`, { recursive: true });
		}

		// if file exists, do not create it again
		if (fs.existsSync(`${destPath}${fileName}`)) {
			resolve();
		} else {
			const writer = createWriteStream(`${destPath}${fileName}`);
			const options = {
				url,
				method: 'get',
				responseType: 'stream',
			};

			axiosInstance(options).then(resp => {
				if (resp.status !== 200) {
					throw new Error(`${resp.status}: Error while fetching ${url}`);
				}
				resp.data.pipe(writer);
				console.log(`${destPath}${fileName} created...`);
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

export default async function(config) {
	const { nodeEnv, srcFolder, publicFolder } = defaultSettings;
	const { isQSPage, isWhiteLabel, page } = config;
	const themeFile = page?.themeFile;
	const cssThemes = page?.cssThemes;
	const isModWhiteLabel = isWhiteLabel && !isQSPage

	let externalResources;
	// listing of Static Resources sub-path and site destination paths
	// key: inputPath, value: destPath

	externalResources = {
		'/quote/resources/mod-site/templates/scripts/trusted-form.html': [`${publicFolder}/resources/scripts/`, 'trusted-form.html'],
		'/quote/resources/data/tcpa.json': [`${srcFolder}/resources/data/`, 'tcpa.json'],
	};

	// grab footer modals and place under the resources
	Object.assign(externalResources, {
		'/quote/resources/shared-resources/templates/modals/about/': [`${srcFolder}/resources/templates/modals/about/`, 'index.html'],
		'/quote/resources/shared-resources/templates/modals/privacy/': [`${srcFolder}/resources/templates/modals/privacy/`, 'index.html'],
		'/quote/resources/shared-resources/templates/modals/terms/': [`${srcFolder}/resources/templates/modals/terms/`, 'index.html'],
		'/quote/resources/shared-resources/templates/modals/contact-us/': [`${srcFolder}/resources/templates/modals/contact-us/`, 'index.html'],
		'/quote/resources/shared-resources/templates/modals/faq/': [`${srcFolder}/resources/templates/modals/faq/`, 'index.html']
	})

	Object.assign(externalResources, {'/quote/resources/mod-site/templates/scripts/jornaya.html': [`${publicFolder}/resources/scripts/`, 'jornaya.html']});

	if (isModWhiteLabel) {
		Object.assign(externalResources, {'/quote/resources/mod-site/templates/scripts/recaptcha.html': [`${publicFolder}/resources/scripts/`, 'recaptcha.html']});
	}

	if (cssThemes && cssThemes.length > 0) {
		cssThemes.forEach(theme => {
			const themeFileName = `_${theme}.scss`;
			const themePath = `/quote/resources/shared-resources/styles/themes/${themeFileName}`;
			Object.assign(externalResources, {[themePath]: [`${srcFolder}/resources/styles/themes/`, themeFileName]});
		});
	}

	// theme JSON
	if (isQSPage && themeFile) {
		Object.assign(externalResources, {
			[`/quote/resources/data/themes/${themeFile}.json`]: [`${srcFolder}/data/`, 'theme.json']
		});
	}

	if (!nodeEnv) {
		throw new Error('Missing environment variables. Did you start with gulp instead of npm run...?');
	}

	const filesPromiseMap = Object.keys(externalResources).map(async key => {
		const destinationPath = externalResources[key][0];
		const fileName = externalResources[key][1];
		await streamToDestination(key, destinationPath, fileName);
	});

	await Promise.all(filesPromiseMap);
	await duplicateHtmlFilestoHbs(externalResources);
}
