import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { expandY, fade, fadeSwitch } from '@app/shared/animations';

@Component({
    selector: 'app-button-doc',
    templateUrl: './button-doc.component.html',
    animations: [expandY, fade, fadeSwitch]
})
export class ButtonDocComponent {
    copied = '';
    examples = new SelectionModel(true);
    object = new SelectionModel(false);
    
    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
