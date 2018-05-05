import { INotepad } from './NotepadTypes';

export interface ISyncedNotepad extends INotepad {
	assetHashes: AssetHashes;
	guid: string;
}

/**
 * Contains MD5 hashes for every asset guid. This is useful for syncing.
 */
export type AssetHashes = {
	[assetGuid: string]: string;
};
