import { combineEpics } from 'redux-observable';
import { filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { Action, isType } from 'redux-typescript-actions';
import { actions } from '../actions';
import { IAsset, INote, INotepad, INotepadStoreState, ISection, NoteElement } from '../types/NotepadTypes';
import { dataURItoBlob, generateGuid, getNotepadObjectByRef, isAction } from '../util';
import * as Parser from 'upad-parse/dist/index.js';
import saveAs from 'save-as';
import { ASSET_STORAGE } from '../index';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { INewNotepadObjectAction, IUpdateElementAction } from '../types/ActionTypes';
import { IStoreState } from '../types';

const loadNote$ = (action$, store) =>
	action$.pipe(
		filter((action: Action<string>) => isType(action, actions.loadNote.started)),
		map((action: Action<string>) => [action.payload, { ...(store.getState().notepads.notepad || <INotepadStoreState> {}).item }]),
		filter(([ref, notepad]: [string, INotepad]) => !!ref && !!notepad),
		map(([ref, notepad]: [string, INotepad]) => {
			let note: INote | false = false;
			getNotepadObjectByRef(notepad, ref, obj => note = <INote> obj);

			return note;
		}),
		filter(Boolean),
		mergeMap((note: INote) => [actions.expandFromNote(note), actions.checkNoteAssets.started([note.internalRef, note.elements])])
	);

const checkNoteAssets$ = (action$, store) =>
	action$.pipe(
		filter((action: Action<[string, NoteElement[]]>) => isType(action, actions.checkNoteAssets.started)),
		map((action: Action<[string, NoteElement[]]>) => action.payload),
		switchMap(([ref, elements]) =>
			fromPromise(getNoteAssets(elements))
				.pipe(map((res) => [ref, res.elements, res.blobUrls]))
		),
		map(([ref, elements, blobUrls]) => [ref, elements, blobUrls, (store.getState().notepads.notepad || <INotepadStoreState> {}).item]),
		filter(([ref, elements, blobUrls, notepad]) => !!notepad),
		mergeMap(([ref, elements, blobUrls, notepad]: [string, NoteElement[], object, INotepad]) => {
			const newNotepad = getNotepadObjectByRef(notepad, ref, obj => {
				(<INote> obj).elements = elements;
				return obj;
			});

			const notepadAssets: Set<string> = new Set(notepad.notepadAssets);
			elements.forEach(element => {
				if (element.content === 'AS') {
					notepadAssets.add(element.args.ext!);
				}
			});
			newNotepad.notepadAssets = Array.from(notepadAssets);

			return [
				actions.checkNoteAssets.done({ params: <any> [], result: newNotepad }),
				actions.loadNote.done({ params: ref, result: blobUrls })
			];
		})
	);

const downloadAsset$ = action$ =>
	action$.pipe(
		filter((action: Action<{ filename: string, uuid: string }>) => isType(action, actions.downloadAsset.started)),
		map((action: Action<{ filename: string, uuid: string }>) => action.payload),
		switchMap(({filename, uuid}: { filename: string, uuid: string }) =>
			fromPromise(ASSET_STORAGE.getItem(uuid))
				.pipe(
					map((blob: Blob) => [blob, filename])
				)
		),
		filter(Boolean),
		tap(([blob, filename]: [Blob, string]) => saveAs(blob, filename)),
		map(([blob, filename]: [Blob, string]) => actions.downloadAsset.done({ params: { filename, uuid: '' }, result: undefined }))
	);

const binaryElementUpdate$ = action$ =>
	action$.pipe(
		isAction(actions.updateElement),
		map((action: Action<IUpdateElementAction>) => action.payload),
		filter((params: IUpdateElementAction) => !!params.newAsset),
		switchMap((params: IUpdateElementAction) =>
			fromPromise(
				ASSET_STORAGE.setItem(params.element.args.ext || generateGuid(), params.newAsset)
					.then(() => [params, params.element.args.ext || generateGuid()])
			)
		),
		mergeMap(([params, guid]: [IUpdateElementAction, string]) => [
			actions.trackAsset(guid),
			actions.updateElement({
				elementId: params.elementId,
				noteRef: params.noteRef,
				element: {
					...params.element,
					content: 'AS',
					args: {
						...params.element.args,
						ext: guid
					}
				}
			}),
			actions.reloadNote(undefined)
		])
	);

const reloadNote$ = (action$, store) =>
	action$.pipe(
		isAction(actions.reloadNote),
		map(() => store.getState()),
		map((state: IStoreState) => state.currentNote.ref),
		filter((noteRef: string) => !!noteRef && noteRef.length > 0),
		map((noteRef: string) => actions.loadNote.started(noteRef))

	);

const autoLoadNewNote$ = (action$, store) =>
	action$.pipe(
		isAction(actions.newNote),
		map((action: Action<INewNotepadObjectAction>) => [action.payload, (<IStoreState> store.getState()).notepads.notepad!.item]),
		filter(([insertAction, notepad]: [INewNotepadObjectAction, INotepad]) => !!insertAction && !!insertAction.parent.internalRef && !!notepad),
		map(([insertAction, notepad]: [INewNotepadObjectAction, INotepad]) => {
			// Find the new section
			let parent: ISection | false = false;
			getNotepadObjectByRef(notepad, insertAction.parent.internalRef!, obj => parent = <ISection> obj);

			return [insertAction, parent];
		}),
		filter(([insertAction, parent]: [INewNotepadObjectAction, ISection]) => !!parent),
		map(([insertAction, parent]: [INewNotepadObjectAction, ISection]) => parent.notes.find(n => n.title === insertAction.title)),
		filter(Boolean),
		map((newNote: INote) => actions.loadNote.started(newNote.internalRef))
	);

export const noteEpics$ = combineEpics(
	loadNote$,
	checkNoteAssets$,
	downloadAsset$,
	binaryElementUpdate$,
	reloadNote$,
	autoLoadNewNote$
);

function getNoteAssets(elements: NoteElement[]): Promise<{ elements: NoteElement[], blobUrls: object }> {
	const storageRequests: Promise<Blob>[] = [];
	const blobRefs: string[] = [];

	elements.map(element => {
		if (element.type !== 'markdown' && element.content !== 'AS') {
			const asset: IAsset = new Parser.Asset(dataURItoBlob(element.content));
			element.args.ext = asset.uuid;
			element.content = 'AS';

			storageRequests.push(ASSET_STORAGE.setItem(asset.uuid, asset.data));
			blobRefs.push(asset.uuid);
		} else if (!!element.args.ext) {
			storageRequests.push(ASSET_STORAGE.getItem(element.args.ext));
			blobRefs.push(element.args.ext);
		}

		return element;
	});

	return new Promise(resolve =>
		Promise.all(storageRequests)
			.then((blobs: Blob[]) => {
				const blobUrls = {};
				blobs.filter(b => !!b).forEach((blob, i) => blobUrls[blobRefs[i]] = URL.createObjectURL(blob));

				resolve({
					elements,
					blobUrls
				});
			})
	);
}
