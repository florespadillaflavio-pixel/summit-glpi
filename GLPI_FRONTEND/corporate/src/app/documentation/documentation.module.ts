import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { routing } from './documentation.routing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { DocumentationComponent } from './documentation.component';
import { ButtonDocComponent } from './components/button-doc/button-doc.component';
import { CardDocComponent } from './components/card-doc/card-doc.component';
import { CheckboxDocComponent } from './components/checkbox-doc/checkbox-doc.component';
import { DividerDocComponent } from './components/divider-doc/divider-doc.component';
import { DrawerDocComponent } from './components/drawer-doc/drawer-doc.component';
import { ExpansionPanelDocComponent } from './components/expansion-panel-doc/expansion-panel-doc.component';
import { FileInputDocComponent } from './components/file-input-doc/file-input-doc.component';
import { RippleDocComponent } from './components/ripple-doc/ripple-doc.component';
import { FormFieldDocComponent } from './components/form-field-doc/form-field-doc.component';
import { AlertDocComponent } from './components/alert-doc/alert-doc.component';
import { GridDocComponent } from './components/grid-doc/grid-doc.component';
import { IconDocComponent } from './components/icon-doc/icon-doc.component';
import { InputDocComponent } from './components/input-doc/input-doc.component';
import { ListDocComponent } from './components/list-doc/list-doc.component';
import { MenuDocComponent } from './components/menu-doc/menu-doc.component';
import { ProgressSpinnerDocComponent } from './components/progress-spinner-doc/progress-spinner-doc.component';
import { RadioDocComponent } from './components/radio-doc/radio-doc.component';
import { SelectDocComponent } from './components/select-doc/select-doc.component';
import { SlideToggleDocComponent } from './components/slide-toggle-doc/slide-toggle-doc.component';
import { SpacerDocComponent } from './components/spacer-doc/spacer-doc.component';
import { StackDocComponent } from './components/stack-doc/stack-doc.component';
import { TabsDocComponent } from './components/tabs-doc/tabs-doc.component';
import { ToolbarDocComponent } from './components/toolbar-doc/toolbar-doc.component';
import { TreeDocComponent } from './components/tree-doc/tree-doc.component';
import { ChipsDocComponent } from './components/chips-doc/chips-doc.component';
import { ColorTextDocComponent } from './components/color-text-doc/color-text-doc.component';
import { DialogDocComponent } from './components/dialog-doc/dialog-doc.component';
import { AdopcionDialogComponent } from './components/dialog-doc/dialogs/adopcion-dialog/adopcion-dialog.component';
import { AutocompleteDocComponent } from './components/autocomplete-doc/autocomplete-doc.component';
import { TableDocComponent } from './components/table-doc/table-doc.component';
import { PaginatorDocComponent } from './components/paginator-doc/paginator-doc.component';
import { SortHeaderDocComponent } from './components/sort-header-doc/sort-header-doc.component';
import { ProgressBarDocComponent } from './components/progress-bar-doc/progress-bar-doc.component';
import { SliderDocComponent } from './components/slider-doc/slider-doc.component';
import { StepperDocComponent } from './components/stepper-doc/stepper-doc.component';
import { TerminosDialogComponent } from './components/dialog-doc/dialogs/terminos-dialog/terminos-dialog.component';

@NgModule({
  declarations: [
    DocumentationComponent,
    ButtonDocComponent,
    CardDocComponent,
    CheckboxDocComponent,
    ChipsDocComponent,
    ColorTextDocComponent,
    DialogDocComponent,
    DividerDocComponent,
    DrawerDocComponent,
    ExpansionPanelDocComponent,
    FileInputDocComponent,
    RippleDocComponent,
    FormFieldDocComponent,
    AlertDocComponent,
    GridDocComponent,
    IconDocComponent,
    InputDocComponent,
    ListDocComponent,
    MenuDocComponent,
    ProgressSpinnerDocComponent,
    RadioDocComponent,
    SelectDocComponent,
    SlideToggleDocComponent,
    SpacerDocComponent,
    StackDocComponent,
    TabsDocComponent,
    ToolbarDocComponent,
    TreeDocComponent,
    AdopcionDialogComponent,
    AutocompleteDocComponent,
    TableDocComponent,
    PaginatorDocComponent,
    SortHeaderDocComponent,
    ProgressBarDocComponent,
    SliderDocComponent,
    StepperDocComponent,
    TerminosDialogComponent
  ],
  imports: [
    CommonModule,
    routing,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule
  ],
  exports: [DocumentationComponent]
})
export class DocumentationModule { }
