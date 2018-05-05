import { INotepad } from '../types/NotepadTypes';
import { AssetHashes, ISyncedNotepad } from '../types/SyncTypes';
import { ASSET_STORAGE } from '../index';
import * as md5 from 'md5';
import { blobToDataURL } from '../util';

export class DifferenceEngineService {
	public static toSyncedNotepad(notepad: INotepad): Promise<ISyncedNotepad> {
		return Promise.all(notepad.notepadAssets.map(guid => ASSET_STORAGE.getItem(guid)))
			.then((assets: Blob[]) => assets.map(async (blob: Blob) => md5(await blobToDataURL(blob))))
			.then((hashes: Promise<string>[]) => Promise.all(hashes))
			.then((hashes: string[]) => {
				const assetHashes: AssetHashes = {};
				hashes.forEach((hash, i) => assetHashes[notepad.notepadAssets[i]] = hash);

				return {
					...notepad,
					assetHashes
				};
			});
	}
}
