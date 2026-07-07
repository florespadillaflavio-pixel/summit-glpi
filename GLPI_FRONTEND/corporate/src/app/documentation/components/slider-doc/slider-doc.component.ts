import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-slider-doc',
    templateUrl: './slider-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class SliderDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    progress1 = new FormControl(50, [Validators.min(0), Validators.max(100)]);

    progress2 = new FormControl(360, [Validators.min(200), Validators.max(500)]);
    buffer2 = new FormControl(420, [Validators.min(200), Validators.max(500)]);

    progress = new FormControl(50, [Validators.min(0), Validators.max(100)]);
    progress3 = new FormControl(50, [Validators.min(0), Validators.max(100)]);
    buffer3 = new FormControl(50, [Validators.min(0), Validators.max(100)]);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
