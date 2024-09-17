import fs from 'fs';

const foldersToDelete = ['./src/resources', './src/accessible-components', './src/shared-components', './src/.tmp', './src/temp', './public/resources'];

foldersToDelete.forEach(async (folder) => {
	try {
		await fs.promises.rm(folder, { recursive: true });
		console.log(`Folder ${folder} deleted successfully`);
	} catch (err) {
		// fail silently
	}
});
