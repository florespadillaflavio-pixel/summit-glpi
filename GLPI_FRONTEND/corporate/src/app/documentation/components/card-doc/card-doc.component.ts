import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { expandY, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-card-doc',
    templateUrl: './card-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class CardDocComponent {
    copied = '';
    examples = new SelectionModel(true);
    
    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
