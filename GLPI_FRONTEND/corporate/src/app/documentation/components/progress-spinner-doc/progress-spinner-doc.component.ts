import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-progress-spinner-doc',
    templateUrl: './progress-spinner-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class ProgressSpinnerDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    percentage = new FormControl(45, [Validators.min(0), Validators.max(100)]);
    diameter = new FormControl(100, [Validators.min(0), Validators.max(100)]);
    strokeWidth = new FormControl(0, [Validators.min(0), Validators.max(50)]);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
