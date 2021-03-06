import { IParent, NoteElement, Source } from './NotepadTypes';

export interface IUpdateElementAction {
	noteRef: string;
	elementId: string;
	element: NoteElement;
	newAsset?: Blob;
}

export interface INewNotepadObjectAction {
	title: string;
	parent: IParent;
}

export interface IInsertElementAction {
	noteRef: string;
	element: NoteElement;
}

export interface IDeleteElementAction {
	noteRef: string;
	elementId: string;
}

export interface IUpdateBibliographyAction {
	noteRef: string;
	sources: Source[];
}
