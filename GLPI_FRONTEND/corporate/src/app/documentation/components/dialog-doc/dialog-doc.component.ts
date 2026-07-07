import { SelectionModel } from '@angular/cdk/collections';
import { Component, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';
import { DialogService } from '@app/shared/material/dialog';
import { TreeControl } from '@app/shared/material/tree';
import { AppTabGroup } from '@app/shared/material/tabs';
import { AdopcionDialogComponent } from './dialogs/adopcion-dialog/adopcion-dialog.component';
import { TerminosDialogComponent } from './dialogs/terminos-dialog/terminos-dialog.component';

type FileNode = {
    name: string;
    icon?: string;
    children?: FileNode[];
}

@Component({
    selector: 'app-dialog-doc',
    templateUrl: './dialog-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class DialogDocComponent {
    @ViewChild('tabs') tabs: AppTabGroup;

    treeControl = new TreeControl<FileNode>(node => node?.children);
    dataSource = [
        {
            name: 'adopcion-dialog',
            children: [
                { name: 'adopcion-dialog.component.html', icon: 'html' },
                { name: 'adopcion-dialog.component.ts', icon: 'javascript' }
            ]
        },
        { name: 'main.component.html', icon: 'html' },
        { name: 'main.component.ts', icon: 'javascript' }
    ];

    dataSource2 = [
        {
            name: 'terminos-dialog',
            children: [
                { name: 'terminos-dialog.component.html', icon: 'html' },
                { name: 'terminos-dialog.component.ts', icon: 'javascript' }
            ]
        },
        { name: 'main.component.html', icon: 'html' },
        { name: 'main.component.ts', icon: 'javascript' }
    ];

    openedTabs = new SelectionModel(true, ['main.component.html']);

    nombreCachorro?: string;
    adoptante = new FormControl('');

    constructor(private dialogService: DialogService) { }

    onClosed(event: unknown) {
        console.log(event);
    }

    openDialog() {
        const dialogRef = this.dialogService.open(AdopcionDialogComponent);
        dialogRef.component.prototype.nombreAdoptante = this.adoptante.value;
        dialogRef.closed.subscribe((nombreCachorro: string) => {
            if (nombreCachorro) this.nombreCachorro = nombreCachorro;
        });
    }

    openBiggerDialog() {
        const dialogRef = this.dialogService.open(TerminosDialogComponent);
        dialogRef.width = '100%';
        dialogRef.maxWidth = 800;
        dialogRef.closed.subscribe((result: boolean) => {
            if (!result) return;
        });
    }

    openFullscreenDialog() {
        const dialogRef = this.dialogService.open(TerminosDialogComponent);
        dialogRef.width = '100%';
        dialogRef.maxWidth = '100%';
        dialogRef.closed.subscribe((result: boolean) => {
            if (!result) return;
        });
    }

    openTab(id: string) {
        this.openedTabs.select(id);
        setTimeout(() => this.tabs.selectTab(null, id));
    }

    copied = '';
    examples = new SelectionModel(true);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
