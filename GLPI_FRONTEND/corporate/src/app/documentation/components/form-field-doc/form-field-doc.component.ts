import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-form-field-doc',
    templateUrl: './form-field-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class FormFieldDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    readonly numeroPar = new FormControl(null, [
        Validators.required,
        (control) => {
            if (control.value === null) return null;
            if (control.value % 2 === 0) return null;
            else return { noEsPar: true };
        }
    ]);
    
    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
