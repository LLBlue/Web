import * as React from 'react';
import { SyntheticEvent } from 'react';
// @ts-ignore
import { Icon, NavItem } from 'react-materialize';
import * as JSZip from 'jszip';

export interface IUploadNotepadsComponentProps {
	parseNpx?: (xml: string) => void;
}

export default class UploadNotepadsComponent extends React.Component<IUploadNotepadsComponentProps> {
	private uploadInput: HTMLInputElement;

	render() {
		return (
			<NavItem href="#!" onClick={this.triggerUpload}>
				<Icon left={true}>file_upload</Icon> Import (npx/zip/enex)
				<input ref={input => this.uploadInput = input!} onChange={this.onUploadChanged} style={{ display: 'none' }} type="file" />
			</NavItem>
		);
	}

	private triggerUpload = () => {
		this.uploadInput.click();
	}

	private onUploadChanged = (event: SyntheticEvent<HTMLInputElement>) => {
		const { parseNpx } = this.props;
		const fileName = event.currentTarget.files![0].name;
		const ext = fileName.split('.').pop()!.toLowerCase();

		switch (ext) {
			case 'npx':
				this.readFileInputEventAsText(event)
					.then(xml => {
						parseNpx!(xml);
					});
				break;

			case 'npxz':
			case 'zip':
				this.readFileInputEventAsArrayBuffer(event)
					.then(arrayBuffer => {
						const zip = new JSZip();
						zip.loadAsync(arrayBuffer)
							.then(() => {
								for (let name in zip.files) {
									if (name.split('.').pop()!.toLowerCase() !== 'npx') continue;

									zip.file(name).async('text')
										.then(xml => parseNpx!(xml));
								}
							});
					});
				break;

			default:
				break;
		}

		// Ensure we can re-upload the same file again
		this.uploadInput.value = '';
	}

	private readFileInputEventAsText(event: SyntheticEvent<HTMLInputElement>): Promise<string> {
		return new Promise(resolve => {
			const file = event.currentTarget.files![0];
			const reader = new FileReader();

			reader.onload = () => resolve(reader.result);

			reader.readAsText(file);
		});
	}

	private readFileInputEventAsArrayBuffer(event: SyntheticEvent<HTMLInputElement>): Promise<ArrayBuffer> {
		return new Promise(resolve => {
			const file = event.currentTarget.files![0];
			const reader = new FileReader();

			reader.onload = () => resolve(reader.result);

			reader.readAsArrayBuffer(file);
		});
	}
}
