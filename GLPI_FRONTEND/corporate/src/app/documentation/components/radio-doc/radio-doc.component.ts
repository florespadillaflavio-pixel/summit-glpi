import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-radio-doc',
    templateUrl: './radio-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class RadioDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }

    metodosPago = ['Efectivo', 'Tarjeta', 'Billetera digital'];
    metodoSeleccionado = new FormControl(this.metodosPago[0]);
}
