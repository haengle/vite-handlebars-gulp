import { defaultSettings } from '../src/data/config.js';
import axios from 'axios';
import { createWriteStream } from 'node:fs';
import * as stream from 'node:stream';
import { promisify } from 'node:util';
import fs from 'node:fs';
import gulp from 'gulp';
import tap from 'gulp-tap';
import hash from 'gulp-hash';
import replace from 'gulp-replace';
import { getFileFromURL } from '../src/scripts/utils.js';
import { responseInterceptor } from '../src/scripts/retry-axios.js';

let fileNames = {};
let componentFolderPath = '';
let replacementFunctions = [];

let pathSubdirectory = '';
let useAccessibleComponents = false;

const axiosInstance = axios.create();
responseInterceptor(axiosInstance);

function replaceModalyticsSrc(gulp, defaultSettings) {
	const resourcePath = '/resources/scripts/mod-alytics/';
	return new Promise((resolve) => {
		gulp.src(`${defaultSettings.srcFolder}/${componentFolderPath}/head/head.html`)
			.pipe(replace(/".*(modalytics).*"/, `"${resourcePath}${fileNames.modAlyticsFileName}"`))
			.pipe(gulp.dest(`${defaultSettings.srcFolder}/${componentFolderPath}/head`))
			.on('finish', resolve);
	});
}

function replaceFootAssetScripts(gulp, defaultSettings) {
	const resourcePath = '/resources/scripts';
	return new Promise((resolve) => {
		gulp.src(`${defaultSettings.srcFolder}/${componentFolderPath}/foot-assets/foot-assets.html`)
			.pipe(replace(/"(?:(?!"|js")[\s\S])+(modutils|mod-utils.*?)js"|"(?:(?!"|")[\s\S])+(callrail.*?)js"|"(?:(?!"|")[\s\S])+(footer\/footer-component.*?)js"|"(?:(?!"|")[\s\S])+(mod-form\/form.*?)js"/g, function(match) {
				if (match.includes('mod-form/form/homeowner')) {
					return `"${resourcePath}/mod-form/form/${fileNames.homeownerFormFileName}"`;
				} else if (match.includes('mod-form/form/contractor')) {
					return `"${resourcePath}/mod-form/form/${fileNames.contractorFormFileName}"`;
				} else if (match.includes('callrail')) {
					return `"${resourcePath}/callrail/${fileNames.callrailFileName}"`;
				} else if (match.includes('modutils') || match.includes('mod-utils')) {
					return `"${resourcePath}/mod-utils/${fileNames.modUtilsFileName}"`;
				} else if (match.includes('footer-component')) {
					return `"${resourcePath}/footer/${fileNames.footerComponentJsFileName}"`;
				}
			}))
			.pipe(gulp.dest(`${defaultSettings.srcFolder}/${componentFolderPath}/foot-assets`))
			.on('finish', function() {
				resolve();
				console.log('>> FINISHED replacing foot asset scripts');
			});
		});
}

function replaceAbandonmentJsCssSrc(gulp, defaultSettings) {
	const abandonmentJsRegex = useAccessibleComponents ? /"(?:(?!"|")[\s\S])+(abandonment\/accessible\/abandonment.*?)js"/ : /"(?:(?!"|")[\s\S])+(abandonment\/abandonment.*?)js"/;
	const jsResourcePath = '/resources/scripts/abandonment/';
	const cssResourcePath = '/resources/styles/components/abandonment/';
	return new Promise((resolve) => {
		gulp.src(defaultSettings.srcFolder + '/pages/abandonment/*.hbs')
			.pipe(replace(abandonmentJsRegex, `"${jsResourcePath}${fileNames.abandonmentJsFileName}"`))
			.pipe(replace(/"(?:(?!"|")[\s\S])+(components\/abandonment\/abandonment.*?)css"/, `"${cssResourcePath}${fileNames.abandonmentStylesFileName}"`))
			.pipe(gulp.dest(defaultSettings.srcFolder + '/pages/abandonment'))
			.on('finish', resolve);
	});
}

function replaceFooterStylesReference(gulp, defaultSettings) {
	if (pathSubdirectory.length > 0) {
		return new Promise((resolve) => {
			gulp.src(defaultSettings.publicFolder + '/resources/scripts/footer/' + fileNames.footerComponentJsFileName)
				.pipe(replace(/concat\((?:(?!concat\(|\))[\s\S])+(components\/footer\/mod.*?)\)/, `concat("${pathSubdirectory}resources/styles/components/footer/` + fileNames.modFooterStylesFileName + '")'))
				.pipe(replace(/concat\((?:(?!concat\(|\))[\s\S])+(components\/footer\/qs.*?)\)/, `concat("${pathSubdirectory}resources/styles/components/footer/` + fileNames.qsFooterStylesFileName + '")'))
				.pipe(gulp.dest(defaultSettings.publicFolder + '/resources/scripts/footer'))
				.on('finish', resolve);
		});
	} else {
		return new Promise((resolve) => {
			gulp.src(defaultSettings.publicFolder + '/resources/scripts/footer/' + fileNames.footerComponentJsFileName)
				.pipe(replace(/concat\((?:(?!concat\(|\))[\s\S])+(components\/footer\/mod.*?)\)/, 'concat("/resources/styles/components/footer/' + fileNames.modFooterStylesFileName + '")'))
				.pipe(replace(/concat\((?:(?!concat\(|\))[\s\S])+(components\/footer\/qs.*?)\)/, 'concat("/resources/styles/components/footer/' + fileNames.qsFooterStylesFileName + '")'))
				.pipe(gulp.dest(defaultSettings.publicFolder + '/resources/scripts/footer'))
				.on('finish', resolve);
		});
	}
}

const TASKS = {
	copyModutils: {
		url: 'mod-utils/modutils.min.js',
		config: {
			fileName: 'modUtilsFileName',
			dest: 'scripts/mod-utils',
		},
		srcReplaceFn: null,
	},
	copyCallrail: {
		url: 'shared-resources/scripts/callrail/callrail.min.js',
		config: {
			fileName: 'callrailFileName',
			dest: 'scripts/callrail',
		},
		srcReplaceFn: null,
	},
	copyFooterComponentJs: {
		url: 'shared-resources/scripts/footer/footer-component.min.js',
		config: {
			fileName: 'footerComponentJsFileName',
			dest: 'scripts/footer',
		},
		srcReplaceFn: null,
	},
	copyHomeownerForm: {
		url: 'mod-form/form/homeowner.min.js',
		config: {
			fileName: 'homeownerFormFileName',
			dest: 'scripts/mod-form/form',
		},
		srcReplaceFn: replaceFootAssetScripts,
	},
	copyContractorForm: {
		url: 'mod-form/form/contractor.min.js',
		config: {
			fileName: 'contractorFormFileName',
			dest: 'scripts/mod-form/form',
		},
		srcReplaceFn: null,
	},
	copyModalytics: {
		url: 'mod-alytics/modalytics.min.js',
		config: {
			fileName: 'modAlyticsFileName',
			dest: 'scripts/mod-alytics',
		},
		srcReplaceFn: replaceModalyticsSrc,
	},
	copyAbandonmentComponentStyles: {
		url: 'shared-resources/styles/components/abandonment/abandonment.min.css',
		config: {
			fileName: 'abandonmentStylesFileName',
			dest: 'styles/components/abandonment',
		},
		srcReplaceFn: null,
	},
	copyAbandonmentJs: {
		url: 'shared-resources/scripts/abandonment/abandonment.min.js',
		config: {
			fileName: 'abandonmentJsFileName',
			dest: 'scripts/abandonment',
		},
		srcReplaceFn: replaceAbandonmentJsCssSrc,
	},
	copyModFooterComponentStyles: {
		url: 'shared-resources/styles/components/footer/mod-footer.min.css',
		config: {
			fileName: 'modFooterStylesFileName',
			dest: 'styles/components/footer',
		},
		srcReplaceFn: null,
	},
	copyQsFooterComponentStyles: {
		url: 'shared-resources/styles/components/footer/qs-footer.min.css',
		config: {
			fileName: 'qsFooterStylesFileName',
			dest: 'styles/components/footer',
		},
		srcReplaceFn: replaceFooterStylesReference,
	}
};

function getResource(task, fileNames, resourcePath = 'quote/resources') {
	const { url, config, srcReplaceFn } = task;

	if (Object.keys(config).length === 0) {
		return false;
	}

	const finished = promisify(stream.finished);

	return new Promise(resolve => {
		const file = getFileFromURL(url);

		if (!fs.existsSync(`${task.config.defaultSettings.publicFolder}/resources/${config.dest}`)) {
			fs.mkdirSync(`${task.config.defaultSettings.publicFolder}/resources/${config.dest}`, { recursive: true });
		}

		// if file exists, do not create it again
		if (fs.existsSync(`${task.config.defaultSettings.publicFolder}/resources/${config.dest}/${file}`)) {
			resolve();
		} else {
			const options = {
				url: `https://${task.config.defaultSettings.nodeEnv}/${resourcePath}/${url}`,
				method: 'get',
				responseType: 'stream'
			}
			axiosInstance(options).then(resp => {
				if (resp.status !== 200) {
					throw new Error(`${resp.status}: Error while fetching ${url}`);
				}

				const writer = createWriteStream(`${task.config.defaultSettings.publicFolder}/resources/${config.dest}/${file}`);
				resp.data.pipe(writer);
				console.log(`${task.config.defaultSettings.publicFolder}/resources/${config.dest}/${file} created...`);
				return finished(writer);
			})
			.then(() => {
				return new Promise((resolve) => {
					gulp.src(`${task.config.defaultSettings.publicFolder}/resources/${config.dest}/${file}`)
					.pipe(hash({
						hashLength: 20,
						algorithm: 'md5',
						template: file.replace(/^([^.]*)\.(.*)$/, '$1-<%= hash %>.$2')
					}))
					.pipe(tap(function(file) {
						file = JSON.stringify(file);
						file = JSON.parse(file).history[1];
						file = file.split('/').pop();
						fileNames[task.config.fileName] = file;
					}))
					.pipe(gulp.dest(`${task.config.defaultSettings.publicFolder}/resources/${config.dest}`))
					.on('finish', function(){
						resolve();
					})
				});
			})
			.then(() => {
				if (!srcReplaceFn) {
					return false;
				}

				if (typeof srcReplaceFn === 'function') {
					replacementFunctions.push(() => srcReplaceFn(gulp, task.config.defaultSettings, task.config.config));
				}

				return true;
			})
			.then(() => {
				resolve();
			})
			.catch((error) => {
				console.error('Error:', error);
			})
			.finally(() => {
				axiosInstance.interceptors.response.eject(responseInterceptor);
			});
		}
	})
}

export default async function(config) {
	const { isLocal } = defaultSettings;
	useAccessibleComponents = config.useAccessibleConfig;
	componentFolderPath = useAccessibleComponents === true ? 'accessible-components' : 'shared-components';
	const tasks = Object.values(TASKS);
	const isPathSubdirectory = config.siteData?.pathSubdirectory || config.pathSubdirectory;
	pathSubdirectory = isLocal === "false" && isPathSubdirectory ? isPathSubdirectory : '';

	if (tasks.length) {
		const getAllResources = tasks.map(async function(task) {
			if (useAccessibleComponents && task.url.includes('abandonment.min.js')) {
				task.url = 'shared-resources/scripts/abandonment/accessible/abandonment.min.js';
				task.config.dest = 'scripts/abandonment/accessible';
			}
			Object.assign(task.config, { defaultSettings, config });
			await getResource(task, fileNames);
		});

		await Promise.all(getAllResources);

		console.log(`>> FILENAMES OBJECT: ${JSON.stringify(fileNames)}`);

		await Promise.all(replacementFunctions.map(async function(fn) {
			if (typeof fn === 'function') {
				await fn();
			}
		}));
		console.log('>> FINISHED replacing all resource paths');
	}
}
