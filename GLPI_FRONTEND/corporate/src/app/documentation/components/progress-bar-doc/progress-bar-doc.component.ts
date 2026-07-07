import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-progress-bar-doc',
    templateUrl: './progress-bar-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class ProgressBarDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    percentage = new FormControl(45, [Validators.min(0), Validators.max(100)]);

    progress = new FormControl(40, [Validators.min(0), Validators.max(100)]);
    buffer = new FormControl(60, [Validators.min(0), Validators.max(100)]);

    progress2 = new FormControl(45, [Validators.min(0), Validators.max(100)]);
    
    progress3 = new FormControl(45, [Validators.min(0), Validators.max(100)]);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
