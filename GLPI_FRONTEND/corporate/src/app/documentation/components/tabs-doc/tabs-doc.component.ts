import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { expandY, fade, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-tabs-doc',
    templateUrl: './tabs-doc.component.html',
    animations: [expandY, fade, fadeSwitch]
})
export class TabsDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }

    tabs = ['Primero', 'Segundo', 'Tercero'];
    selected = new FormControl(0);
    hovered = new SelectionModel(false);

    addTab(selectAfterAdding: boolean) {
        this.tabs.push('Nueva Pestaña');
        if (selectAfterAdding) this.selected.setValue(this.tabs.length - 1);
    }

    removeTab(index: number) {
        this.tabs.splice(index, 1);
        this.selected.setValue(Math.min(index, this.tabs.length));
    }
}
