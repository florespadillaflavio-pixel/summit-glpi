import { RouterModule, Routes } from "@angular/router";
import { DocumentationComponent } from "./documentation.component";

export const routes: Routes = [
    {
        path: '',
        component: DocumentationComponent,
    },
];

export const routing = RouterModule.forChild(routes);
