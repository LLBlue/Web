import { INotepad } from './NotepadTypes';

export interface ISyncedNotepad extends INotepad {
	assetHashes: AssetHashes;
}

/**
 * Contains MD5 hashes for every asset guid. This is useful for syncing.
 */
export type AssetHashes = {
	[assetGuid: string]: string;
};
