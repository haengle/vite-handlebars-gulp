export const defaultSettings = {
	tmpFolder: '.tmp', 
	srcFolder: 'src',
	distFolder: 'dist',
	publicFolder: 'public',
	fontsSubfolder: 'fonts',
	imagesSubfolder: 'images', 
	stylesSubfolder: 'styles',  
	scriptsSubfolder: 'scripts',
	scriptsCompiledFolder: 'scripts/compiled',
	templatesSubfolder: 'templates', 
	dataSubfolder: 'data',  
	modBuild: '',
	nodeEnv: process.env.NODE_ENV,
	isLocal: process.env.IS_LOCAL || import.meta?.env?.DEV,
	buildPath: process.env.BUILD_PATH
}