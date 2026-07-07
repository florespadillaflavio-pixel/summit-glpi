import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-slide-toggle-doc',
    templateUrl: './slide-toggle-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class SlideToggleDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    readonly configuracion = this._formBuilder.group({
        notificaciones: new FormControl(false),
        camara: new FormControl(false),
        fotos: new FormControl(false),
    });

    constructor(private readonly _formBuilder: FormBuilder) {}

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
