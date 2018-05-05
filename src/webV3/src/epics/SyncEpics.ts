import { combineEpics } from 'redux-observable';
import { actions } from '../actions';
import { isAction } from '../util';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { INotepad } from '../types/NotepadTypes';
import { Action } from 'redux-typescript-actions';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { DIFFERENCE_ENGINE_SERVICE } from '../index';

const restoreOnSave$ = action$ =>
	action$.pipe(
		isAction(actions.saveNotepad.started),
		map((action: Action<INotepad>) => action.payload),
		switchMap((notepad: INotepad) => fromPromise(DIFFERENCE_ENGINE_SERVICE.toSyncedNotepad(notepad))),
		filter(() => false)
	);

export const syncEpics$ = combineEpics(
	restoreOnSave$
);
