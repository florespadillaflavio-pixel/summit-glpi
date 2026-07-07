import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-file-input-doc',
    templateUrl: './file-input-doc.component.html',
    animations: [expandY, fadeSwitch],
})
export class FileInputDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }

    rejectedFiles: File[] = [];

    onChange(files: File[]) {
        console.log('Accepted:', files);
    }

    onRejected(files: File[]) {
        console.log('Rejected:',files);
    }

    onRejected2(files: File[]) {
        this.rejectedFiles = files;
        console.log('Rejected:',files);
        setTimeout(() => this.rejectedFiles = [], 2000 * files.length);
    }
}
