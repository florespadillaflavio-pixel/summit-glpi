import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';
import { AppCheckboxChange } from '@app/shared/material/checkbox/checkbox-change-event';

@Component({
    selector: 'app-checkbox-doc',
    templateUrl: './checkbox-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class CheckboxDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    task = 'Parent Task';
    subtasks = ['Subtask 1', 'Subtask 2', 'Subtask 3'];
    selection = new SelectionModel(true);

    readonly aditivos = this._formBuilder.group({
        gaseosa: new FormControl(false),
        papas: new FormControl(false),
        pure: new FormControl(false),
    });

    constructor(private readonly _formBuilder: FormBuilder) {}

    get indeterminate() {
        if (this.selection.isEmpty()) return false;
        return this.selection.selected.length < this.subtasks.length;
    }

    update(event: AppCheckboxChange) {
        if (event.checked) this.selection.select(...this.subtasks);
        else this.selection.clear();
    }

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
