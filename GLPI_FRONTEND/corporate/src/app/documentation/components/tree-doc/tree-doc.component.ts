import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
  selector: 'app-tree-doc',
  templateUrl: './tree-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class TreeDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
