import 'material-icons-font/material-icons-font.css';
import 'materialize-css/dist/css/materialize.min.css';
import 'jquery/dist/jquery.slim.js';
import 'materialize-css/dist/js/materialize.js';
import * as React from 'react';
import registerServiceWorker from './registerServiceWorker';
import './index.css';
import { IStoreState, MICROPAD_URL } from './types';
import { applyMiddleware, createStore } from 'redux';
import { BaseReducer } from './reducers/BaseReducer';
import { epicMiddleware } from './epics';
import { composeWithDevTools } from 'redux-devtools-extension';
import * as localforage from 'localforage';
import * as ReactDOM from 'react-dom';
import { actions } from './actions';
import { Provider } from 'react-redux';
import HeaderComponent from './containers/header/HeaderContainer';
import NotepadExplorerComponent from './containers/NotepadExplorerContainer';
import NoteViewerComponent from './containers/NoteViewerContainer';
import { enableKeyboardShortcuts } from './shortcuts';
import { OldSyncHandler } from './old-sync/OldSyncHandler';
import * as QueryString from 'querystring';
import { DifferenceEngineService } from './sync/DifferenceEngineService';
import * as PrintTemplate from 'react-print';
import PrintViewComponent from './containers/PrintViewContainer';

try {
	document.domain = MICROPAD_URL.split('//')[1];
} catch (err) {
	console.warn(`Couldn't set domain for resolving CORS. If this is prod change 'MICROPAD_URL'.`);
}

const baseReducer: BaseReducer = new BaseReducer();
const store = createStore<IStoreState>(
	baseReducer.reducer,
	baseReducer.initialState,
	composeWithDevTools(applyMiddleware(epicMiddleware)));

export const NOTEPAD_STORAGE = localforage.createInstance({
	name: 'MicroPad',
	storeName: 'notepads'
});

export const ASSET_STORAGE = localforage.createInstance({
		name: 'MicroPad',
		storeName: 'assets'
});

export const DIFFERENCE_ENGINE_SERVICE = new DifferenceEngineService(store);

Promise.all([NOTEPAD_STORAGE.ready(), ASSET_STORAGE.ready(), localforage.getItem('font size')])
	.then(([r, r2, fs]: [void, void, string]) => !!fs && store.dispatch(actions.updateDefaultFontSize(fs)))
	.then(() => store.dispatch(actions.getNotepadList.started(undefined)))
	.then(() => ReactDOM.render(
		<Provider store={store}>
			<div>
				<HeaderComponent />
				<div id="body">
					<NoteViewerComponent />
					<NotepadExplorerComponent />
				</div>
			</div>
		</Provider>,
		document.getElementById('react-no-print') as HTMLElement
	))
	.then(() => ReactDOM.render(
		<PrintTemplate>
			<Provider store={store}>
				<PrintViewComponent />
			</Provider>
		</PrintTemplate>,
		document.getElementById('print-mount') as HTMLElement
	))
	.then(() => localforage.getItem('hasRunBefore'))
	.then(async (hasRunBefore: boolean) => {
		if (!hasRunBefore) store.dispatch(actions.getHelp(undefined));
		await localforage.setItem('hasRunBefore', true);
	})
	.then(() => {
		const downloadNotepadUrl = QueryString.parse(location.search.slice(1)).download;
		if (!!downloadNotepadUrl && typeof downloadNotepadUrl === 'string') store.dispatch(actions.downloadNotepad.started(downloadNotepadUrl));
	});

new OldSyncHandler(store);
enableKeyboardShortcuts(store);
registerServiceWorker();
