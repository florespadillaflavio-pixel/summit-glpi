import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { expandX, expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-chips-doc',
    templateUrl: './chips-doc.component.html',
    animations: [expandX, expandY, fadeSwitch]
})
export class ChipsDocComponent {
    copied = '';
    examples = new SelectionModel(true);
    items = new SelectionModel(true);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }

    // Example 3

    filtros = new SelectionModel(true, ['activo', 'marzo', 'venta']);

    // Example 4, 5

    colors = ['main', 'accent', 'info', 'success', 'warning', 'danger', 'default'];
    personajes = ['Ryu', 'Chun-Li', 'Sagat', 'Guile', 'Zangief', 'Blanka', 'Dhalsim'];
    selection = new SelectionModel(true);

    // Example 5

    selection5 = new SelectionModel(true);

}
