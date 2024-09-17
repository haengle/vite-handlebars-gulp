import handlebars from '@vituum/vite-plugin-handlebars'
import vituum from 'vituum'
import eslint from 'vite-plugin-eslint'
import stylelint from 'vite-plugin-stylelint';
import { defaultSettings } from './src/data/config.js'
import { defineConfig } from 'vite'
import { startModBuild } from './tasks/serve.js'
import { updateConfig, STATIC_COPY_TARGETS, updateHandlebarsOnWatch } from './src/scripts/plugins.js'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { glob } from 'glob'
import fs from "node:fs";

export default defineConfig((config) => ({
	build: {
		outDir: `${defaultSettings.distFolder}`
	},
	plugins: [
		startModBuild(config),
		vituum(),
		handlebars({
			root: './src',
			reload: false,
			data: ['src/.tmp/config.json'],
			formats: ['json', 'html', 'hbs'],
			globals: config,
			partials: {
				directory: 'src/templates/',
			}
		}),
		updateConfig(config),
		viteStaticCopy({
			targets: STATIC_COPY_TARGETS,
		}),
		{
			...eslint({
				failOnWarning: false,
				failOnError: false,
				include: [`${defaultSettings.srcFolder}/${defaultSettings.scriptsSubfolder}/*.js`]
			}),
			apply: 'build',
		},
		{
			...eslint({
				failOnWarning: false,
				failOnError: false,
				include: [`${defaultSettings.srcFolder}/${defaultSettings.scriptsSubfolder}/*.js`]
			}),
			apply: 'serve',
			enforce: 'post'
		},
		stylelint({
			exclude: ['node_modules', 'accessible-components', 'shared-components'],
			fix: true
		}),
		{
			name: 'replace-src-paths',
			writeBundle: async () => {
				const globFiles = [
					defaultSettings.distFolder + '/**/index.html',
					defaultSettings.distFolder + '/assets/*.css',
				];
				
				for (const globFile of globFiles) {
					const files = glob.sync(globFile);
					
					for (const file of files) {
						console.log(file);
						let contents = await fs.promises.readFile(file, 'utf-8');
						let updatedContents = '';

						if (config.pathSubdirectory && config.pathSubdirectory.length > 0) {
							updatedContents = contents
								.replace(/(src|data-load)="\/?src\//g, `$1="${config.pathSubdirectory}`)
								.replace(/(src|srcset|data-load|href)="\/?assets\//g, `$1="${config.pathSubdirectory}assets/`)
								.replace(/(src|data-load|href)="\/?resources\//g, `$1="${config.pathSubdirectory}resources/`)
								.replace(/url\((\/?assets\/)/g, `url(${config.pathSubdirectory}assets/`)
						} else {
							updatedContents = contents.replace(/(src|data-load)="\/?src\//g, '$1="/');
						}

						await fs.promises.writeFile(file, updatedContents);
					}
				}
			},
			apply: 'build',
		},
		updateHandlebarsOnWatch(config)
	],
	define: {
		'process.env': process.env
	}
}))
