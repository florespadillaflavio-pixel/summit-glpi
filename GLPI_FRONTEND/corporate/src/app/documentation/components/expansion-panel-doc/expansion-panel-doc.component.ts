import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-expansion-panel-doc',
    templateUrl: './expansion-panel-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class ExpansionPanelDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
