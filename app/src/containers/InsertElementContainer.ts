import { IStoreState } from '../types';
import { connect, Dispatch } from 'react-redux';
import { Action } from 'redux';
import { getNotepadObjectByRef } from '../util';
import { INote } from '../types/NotepadTypes';
import { actions } from '../actions';
import {
	default as InsertElementComponent,
	IInsertElementComponentProps
} from '../components/note-viewer/InsertElementComponent';

export function mapStateToProps({ notepads, currentNote, meta }: IStoreState) {
	let note = <INote> {};
	if (currentNote.ref.length !== 0) {
		getNotepadObjectByRef(notepads.notepad!.item!, currentNote.ref, obj => note = <INote> obj);
	}

	return {
		note,
		x: currentNote.insertElement.x,
		y: currentNote.insertElement.y,
		enabled: currentNote.insertElement.enabled,
		fontSize: meta.defaultFontSize
	};
}

export function mapDispatchToProps(dispatch: Dispatch<Action>): Partial<IInsertElementComponentProps> {
	return {
		insert: action => dispatch(actions.insertElement(action)),
		toggleInsertMenu: opts => dispatch(actions.toggleInsertMenu(opts)),
		edit: id => dispatch(actions.openEditor(id))
	};
}

export default connect<IInsertElementComponentProps>(mapStateToProps, mapDispatchToProps)(InsertElementComponent);
