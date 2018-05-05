import { INotepad } from '../types/NotepadTypes';
import { AssetHashes, ISyncedNotepad } from '../types/SyncTypes';
import { ASSET_STORAGE } from '../index';
import * as md5 from 'md5';
import { blobToDataURL, restoreObject } from '../util';
import * as localforage from 'localforage';
import * as Automerge from 'automerge';
import * as Parser from 'upad-parse';
import * as stringify from 'json-stringify-safe';
import { IStoreState } from '../types';
import { Store } from 'redux';

export class DifferenceEngineService {
	private readonly persistentSyncedStorage: LocalForage;

	public static toNotepad(syncedNotepad: ISyncedNotepad): INotepad {
		const cleanSynced = { ...syncedNotepad };
		delete cleanSynced.assetHashes;

		return restoreObject<INotepad>({
			...(<INotepad> cleanSynced)
		}, Parser.createNotepad(''));
	}

	constructor(private store: Store<IStoreState>) {
		this.persistentSyncedStorage = localforage.createInstance({
			name: 'MicroPad',
			storeName: 'Synced Notepads'
		});

		this.initConnection();
	}

	public toSyncedNotepad(notepad: INotepad): Promise<any> {
		return Promise.all(notepad.notepadAssets.map(guid => ASSET_STORAGE.getItem(guid)))
			.then((assets: Blob[]) => assets.map(async (blob: Blob) => md5(await blobToDataURL(blob))))
			.then((hashes: Promise<string>[]) => Promise.all(hashes))
			.then(async (hashes: string[]) => {
				const assetHashes: AssetHashes = {};
				hashes.forEach((hash, i) => assetHashes[notepad.notepadAssets[i]] = hash);

				const notepadDoc = Automerge.change(Automerge.init(), state => {
					state.notepad = {
						...JSON.parse(stringify({
							...notepad,
							assetHashes
						}))
					};
				});

				const changes = await this.getChanges(notepadDoc);
				await this.applyChanges(notepad.title, changes);
				return changes;
			});
	}

	public async getChanges(currentNotepadDoc: any) {
		const oldNotepad = await this.getSyncedNotepadFromText(currentNotepadDoc.title);
		return Automerge.getChanges(oldNotepad, currentNotepadDoc);
	}

	public async applyChanges(title: string, changes: any) {
		let currentNotepadDoc: any = await this.getSyncedNotepadFromText(title);
		currentNotepadDoc = Automerge.applyChanges(currentNotepadDoc, changes);
		await this.persistentSyncedStorage.setItem(currentNotepadDoc.notepad.title, Automerge.save(currentNotepadDoc));

		return currentNotepadDoc;
	}

	public async getSyncedNotepadFromText(title: string, serialisedState?: string) {
		if (!!serialisedState) return Automerge.load(serialisedState);

		const storedNotepad = await this.persistentSyncedStorage.getItem(title);
		return (!!storedNotepad) ? Automerge.load(storedNotepad) : Automerge.init();
	}

	private initConnection() {
		return;
	}
}
