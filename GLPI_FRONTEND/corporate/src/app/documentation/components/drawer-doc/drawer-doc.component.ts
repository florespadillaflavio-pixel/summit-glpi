import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { expandY, fadeSwitch } from '@app/shared/animations';

type MenuItem = {
    name: string;
    icon: string;
    variant: string;
    content: string;
}

@Component({
    selector: 'app-drawer-doc',
    templateUrl: './drawer-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class DrawerDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    selection = new SelectionModel<MenuItem>(false);

    menu: MenuItem[] = [
        { name: 'Item A', icon: 'home', variant: 'menu', content: 'Content A' },
        { name: 'Item B', icon: 'settings', variant: 'menu', content: 'Content B' },
        { name: 'Item C', icon: 'favorite', variant: 'submenu', content: 'Content C' },
        { name: 'Item D', icon: 'star', variant: 'submenu', content: 'Content D' },
        { name: 'Item E', icon: 'map', variant: 'submenu', content: 'Content E' },
        { name: 'Item F', icon: 'eco', variant: 'submenu', content: 'Content F' },
        { name: 'Item G', icon: 'casino', variant: 'submenu', content: 'Content G' },
    ];

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
