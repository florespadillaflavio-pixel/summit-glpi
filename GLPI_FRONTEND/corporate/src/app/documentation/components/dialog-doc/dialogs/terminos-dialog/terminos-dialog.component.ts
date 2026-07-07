import { Component, Optional } from '@angular/core';
import { AppDialog } from '@app/shared/material/dialog';

@Component({
    selector: 'app-terminos-dialog',
    templateUrl: './terminos-dialog.component.html',
})
export class TerminosDialogComponent {
    constructor(@Optional() private dialog: AppDialog<boolean>) { }

    realizarTask(dato: boolean) {
        // Algún Task
        // ...
        this.dialog.close(dato);
    }
}
