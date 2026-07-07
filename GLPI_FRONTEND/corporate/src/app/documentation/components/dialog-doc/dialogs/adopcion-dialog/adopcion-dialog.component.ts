import { Component, Input } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';

@Component({
    selector: 'app-adopcion-dialog',
    templateUrl: './adopcion-dialog.component.html',
})
export class AdopcionDialogComponent {
    @Input() nombreAdoptante?: string;
    cachorro = new FormControl('', Validators.required);
}
