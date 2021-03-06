import * as React from 'react';
import { IElementArgs, INote, NoteElement } from '../../types/NotepadTypes';
import { IInsertElementAction } from '../../types/ActionTypes';
import './elements/NoteElementComponent.css';
import './InsertElementComponent.css';
import { IInsertElementState } from '../../reducers/NoteReducer';
import { generateGuid } from 'src/util';
import { Icon } from 'react-materialize';
import JupyterInserterComponent from './elements/JupyterInserterComponent';

export interface IInsertElementComponentProps {
	note: INote;
	x: number;
	y: number;
	enabled: boolean;
	fontSize: string;
	insert?: (action: IInsertElementAction) => void;
	toggleInsertMenu?: (opts: Partial<IInsertElementState>) => void;
	edit?: (id: string) => void;
}

export default class InsertElementComponent extends React.Component<IInsertElementComponentProps> {
	render() {
		const { x, y, enabled, fontSize } = this.props;

		const containerStyles = {
			left: x,
			top: y,
			zIndex: 5000,
			display: (enabled) ? undefined : 'none'
		};

		const insertX = Math.abs(Math.floor(document.getElementById('note-container')!.getBoundingClientRect().left)) + x;
		const insertY = (Math.abs(Math.floor(document.getElementById('note-container')!.getBoundingClientRect().top)) + y) - 128;

		const defaultArgs: IElementArgs = {
			id: '',
			x: insertX + 'px',
			y: insertY + 'px',
			width: 'auto',
			height: 'auto'
		};

		return (
			<div className="noteElement" style={containerStyles}>
				<div id="insert-element" className="z-depth-2 hoverable">
					<h4>Insert an Element</h4>
					<ul>
						<li><a href="#!" onClick={() => this.doInsert({
							type: 'markdown',
							args: {
								...defaultArgs,
								fontSize: fontSize
							},
							content: ''
						})}><Icon left={true}>edit</Icon> Text (with markdown formatting)</a></li>

						<li><a href="#!" onClick={() => this.doInsert({
							type: 'image',
							args: {
								...defaultArgs,
								ext: generateGuid()
							},
							content: 'AS'
						})}><Icon left={true}>image</Icon> Image</a></li>

						<li><a href="#!" onClick={() => this.doInsert({
							type: 'drawing',
							args: {
								...defaultArgs,
								ext: generateGuid()
							},
							content: 'AS'
						})}><Icon left={true}>gesture</Icon> Drawing</a></li>

						<li><a href="#!" onClick={() => this.doInsert({
							type: 'file',
							args: {
								...defaultArgs,
								ext: generateGuid(),
								filename: ''
							},
							content: 'AS'
						})}><Icon left={true}>insert_drive_file</Icon> File</a></li>

						<li><a href="#!" onClick={() => this.doInsert({
							type: 'recording',
							args: {
								...defaultArgs,
								ext: generateGuid(),
								filename: ''
							},
							content: 'AS'
						})}><Icon left={true}>record_voice_over</Icon> Recording</a></li>

						<li><JupyterInserterComponent insertElement={element => this.doInsert({
							...element,
							args: {
								...defaultArgs,
								width: '500px'
							}
						})} /></li>
					</ul>
				</div>
			</div>
		);
	}

	private doInsert = (element: NoteElement) => {
		const { note, insert, toggleInsertMenu, edit } = this.props;
		toggleInsertMenu!({ enabled: false });

		const id = `${element.type}${note.elements.filter(e => e.type === element.type).length + 1}`;
		insert!({
			element: {
				...element,
				args: {
					...element.args,
					id
				}
			},
			noteRef: note.internalRef
		});

		edit!(id);
	}
}
