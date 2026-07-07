import { ComponentPortal, Portal } from '@angular/cdk/portal';
import { Component } from '@angular/core';
import { PlatformService, ThemeService } from '@app/core/services';
import { fade, fadeRoute } from '@app/shared/animations';
import {
    AlertDocComponent,
    AutocompleteDocComponent,
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
    FormFieldDocComponent,
    GridDocComponent,
    IconDocComponent,
    InputDocComponent,
    ListDocComponent,
    MenuDocComponent,
    PaginatorDocComponent,
    ProgressBarDocComponent,
    ProgressSpinnerDocComponent,
    RadioDocComponent,
    RippleDocComponent,
    SelectDocComponent,
    SliderDocComponent,
    SlideToggleDocComponent,
    SortHeaderDocComponent,
    SpacerDocComponent,
    StackDocComponent,
    StepperDocComponent,
    TableDocComponent,
    TabsDocComponent,
    ToolbarDocComponent
} from '@app/devtools/documentation';
import { SelectionModel } from '@angular/cdk/collections';

type MenuOption = {
    name: string;
    icon: string;
    disabled: boolean;
    tag?: string;
    portal?: ComponentPortal<unknown>;
}

type Feature = {
    name: string;
    icon: string;
    menu: MenuOption[];
    filter: string[];
}

@Component({
    selector: 'app-documentation',
    host: { 'class': 'app-documentation' },
    templateUrl: './documentation.component.html',
    animations: [fade, fadeRoute]
})
export class DocumentationComponent {
    title: string = '';
    portal: Portal<unknown>;

    coreMenu: MenuOption[] = [
        { name: 'Guards', icon: '', disabled: false },
        { name: 'Auth Guard',       icon: 'shield', disabled: false },
        { name: 'General Guard',    icon: 'shield', disabled: false },
        { name: 'Services', icon: '', disabled: false },
        { name: 'Notification Service', icon: 'warning',        disabled: false },
        { name: 'Platform Service',     icon: 'devices',        disabled: false },
        { name: 'Storage Service',      icon: 'home_storage',   disabled: false },
        { name: 'Theme Service',        icon: 'routine',        disabled: false },
        { name: 'Util Service',         icon: 'build',          disabled: false },
        { name: 'Window Service',       icon: 'open_in_new',    disabled: false },
        { name: 'Web Config', icon: '', disabled: false },
        { name: 'Web Config',   icon: 'settings',   disabled: false },

    ];
    
    basesMenu: MenuOption[] = [
        { name: 'Box Base',         icon: 'square',             disabled: false },
        { name: 'Button Base',      icon: 'buttons_alt',        disabled: false },
        { name: 'Image Base',       icon: 'image',              disabled: false },
        { name: 'Platform Base',    icon: 'screenshot_monitor', disabled: false },
        { name: 'Text Base',        icon: 'notes',              disabled: false },
    ];

    componentsFilter = ['button', 'data', 'form', 'layout', 'overlay', 'presentation', 'text'];
    componentsMenu: MenuOption[] = [
        { name: 'Alert',            icon: 'info',                   tag: 'presentation',    disabled: false, portal: new ComponentPortal(AlertDocComponent) },
        { name: 'Autocomplete',     icon: 'prompt_suggestion',      tag: 'form',            disabled: false, portal: new ComponentPortal(AutocompleteDocComponent) },
        { name: 'Badge',            icon: 'app_badging',            tag: 'text',            disabled: true },
        { name: 'Bottom Sheet',     icon: 'bottom_sheets',          tag: 'overlay',         disabled: true },
        { name: 'Button',           icon: 'add_box',                tag: 'button',          disabled: false, portal: new ComponentPortal(ButtonDocComponent) },
        { name: 'Button Toggle',    icon: 'view_column',            tag: 'button',          disabled: true },
        { name: 'Card',             icon: 'dock_to_bottom',         tag: 'presentation',    disabled: false, portal: new ComponentPortal(CardDocComponent) },
        { name: 'Carousel',         icon: 'view_carousel',          tag: 'presentation',    disabled: true },
        { name: 'Checkbox',         icon: 'check_box',              tag: 'form',            disabled: false, portal: new ComponentPortal(CheckboxDocComponent) },
        { name: 'Chips',            icon: 'voting_chip',            tag: 'button',          disabled: false, portal: new ComponentPortal(ChipsDocComponent) },
        { name: 'Colorpicker',      icon: 'palette',                tag: 'form',            disabled: true },
        { name: 'Color Text',       icon: 'format_color_text',      tag: 'text',            disabled: false, portal: new ComponentPortal(ColorTextDocComponent) },
        { name: 'Datepicker',       icon: 'calendar_today',         tag: 'form',            disabled: true },
        { name: 'Dialog',           icon: 'dialogs',                tag: 'overlay',         disabled: false, portal: new ComponentPortal(DialogDocComponent) },
        { name: 'Divider',          icon: 'horizontal_rule',        tag: 'layout',          disabled: false, portal: new ComponentPortal(DividerDocComponent) },
        { name: 'Drawer',           icon: 'side_navigation',        tag: 'layout',          disabled: false, portal: new ComponentPortal(DrawerDocComponent) },
        { name: 'Expansion Panel',  icon: 'expansion_panels',       tag: 'button',          disabled: false, portal: new ComponentPortal(ExpansionPanelDocComponent) },
        { name: 'File Input',       icon: 'upload_file',            tag: 'form',            disabled: false, portal: new ComponentPortal(FileInputDocComponent) },
        { name: 'Form Field',       icon: 'text_fields_alt',        tag: 'form',            disabled: false, portal: new ComponentPortal(FormFieldDocComponent) },
        { name: 'Grid',             icon: 'grid_view',              tag: 'layout',          disabled: false, portal: new ComponentPortal(GridDocComponent) },
        { name: 'Icon',             icon: 'interests',              tag: 'text',            disabled: false, portal: new ComponentPortal(IconDocComponent) },
        { name: 'Input',            icon: 'text_fields',            tag: 'form',            disabled: false, portal: new ComponentPortal(InputDocComponent) },
        { name: 'List',             icon: 'lists',                  tag: 'layout',          disabled: false, portal: new ComponentPortal(ListDocComponent) },
        { name: 'Menu',             icon: 'table_rows_narrow',      tag: 'overlay',         disabled: false, portal: new ComponentPortal(MenuDocComponent) },
        { name: 'Paginator',        icon: 'switch_left',            tag: 'data',            disabled: false, portal: new ComponentPortal(PaginatorDocComponent) },
        { name: 'Progress Bar',     icon: 'sliders',                tag: 'data',            disabled: false, portal: new ComponentPortal(ProgressBarDocComponent) },
        { name: 'Progress Spinner', icon: 'progress_activity',      tag: 'data',            disabled: false, portal: new ComponentPortal(ProgressSpinnerDocComponent) },
        { name: 'Radio',            icon: 'radio_button_checked',   tag: 'form',            disabled: false, portal: new ComponentPortal(RadioDocComponent) },
        { name: 'Ripple',           icon: 'ripples',                tag: 'button',          disabled: false, portal: new ComponentPortal(RippleDocComponent) },
        { name: 'Select',           icon: 'keyboard_arrow_down',    tag: 'form',            disabled: false, portal: new ComponentPortal(SelectDocComponent) },
        { name: 'Slide Toggle',     icon: 'toggle_on',              tag: 'form',            disabled: false, portal: new ComponentPortal(SlideToggleDocComponent) },
        { name: 'Slider',           icon: 'tune',                   tag: 'form',            disabled: false, portal: new ComponentPortal(SliderDocComponent) },
        { name: 'Snackbar',         icon: 'toast',                  tag: 'overlay',         disabled: true },
        { name: 'Sort Header',      icon: 'sort_by_alpha',          tag: 'data',            disabled: false, portal: new ComponentPortal(SortHeaderDocComponent) },
        { name: 'Spacer',           icon: 'fit_page_width',         tag: 'layout',          disabled: false, portal: new ComponentPortal(SpacerDocComponent) },
        { name: 'Stack',            icon: 'table_rows',             tag: 'layout',          disabled: false, portal: new ComponentPortal(StackDocComponent) },
        { name: 'Stepper',          icon: 'steppers',               tag: 'presentation',    disabled: false, portal: new ComponentPortal(StepperDocComponent) },
        { name: 'Table',            icon: 'table',                  tag: 'data',            disabled: false, portal: new ComponentPortal(TableDocComponent) },
        { name: 'Tabs',             icon: 'tab',                    tag: 'presentation',    disabled: false, portal: new ComponentPortal(TabsDocComponent) },
        { name: 'Timepicker',       icon: 'schedule',               tag: 'form',            disabled: true },
        { name: 'Toolbar',          icon: 'toolbar',                tag: 'layout',          disabled: false, portal: new ComponentPortal(ToolbarDocComponent) },
        { name: 'Tooltip',          icon: 'tooltip',                tag: 'overlay',         disabled: true },
        { name: 'Tree',             icon: 'account_tree',           tag: 'data',            disabled: false },
    ];

    cdkMenu: MenuOption[] = [
        { name: 'Clipboard',        icon: 'content_copy',       disabled: false },
        { name: 'Defer',            icon: 'frame_reload',       disabled: false },
        { name: 'Drag & Drop',      icon: 'drag_indicator',     disabled: true },
        { name: 'Ellipsis',         icon: 'more_horiz',         disabled: false },
        { name: 'Portal',           icon: 'switch_access_2',    disabled: true },
        { name: 'Position',         icon: 'picture_in_picture', disabled: false },
        { name: 'Scrollable',       icon: 'stat_minus_2',       disabled: false },
        { name: 'Swipe',            icon: 'swipe',              disabled: true },
        { name: 'Transform',        icon: 'change_circle',      disabled: false },
        { name: 'Transition',       icon: 'motion_mode',        disabled: false },
    ];

    pipesMenu: MenuOption[] = [
        { name: 'Field Filter', icon: 'filter_alt', disabled: false },
        { name: 'File Size',    icon: 'code',       disabled: false },
        { name: 'Safe URL',     icon: 'shield',     disabled: false },
    ]

    chartsMenu: MenuOption[] = [
    ];

    animationsMenu: MenuOption[] = [
        { name: 'Blur',     icon: 'blur_on',                disabled: false },
        { name: 'Chop',     icon: 'transition_chop',        disabled: false },
        { name: 'Dissolve', icon: 'transition_dissolve',    disabled: false },
        { name: 'Expand',   icon: 'expand',                 disabled: false },
        { name: 'Fade',     icon: 'transition_fade',        disabled: false },
        { name: 'Push',     icon: 'transition_push',        disabled: false },
        { name: 'Slide',    icon: 'transition_slide',       disabled: false },
        { name: 'Swipe',    icon: 'swipe',                  disabled: false },
    ];

    navigationMenu: MenuOption[] = [
        { name: 'Breadcrumbs',  icon: 'variables',  disabled: false },
        { name: 'Sub Nav',      icon: 'tile_small', disabled: false },
        { name: 'Title',        icon: 'title',      disabled: false },
    ];

    features: Feature[] = [
        { name: 'Core',                 icon: 'memory',         menu: this.coreMenu,        filter: []  },
        { name: 'Bases',                icon: 'circle',         menu: this.basesMenu,       filter: [] },
        { name: 'UI Components',        icon: 'deployed_code',  menu: this.componentsMenu,  filter: this.componentsFilter },
        { name: 'Component Dev Kit',    icon: 'api',            menu: this.cdkMenu,         filter: []  },
        { name: 'Pipes',                icon: 'valve',          menu: this.pipesMenu,       filter: []  },
        { name: 'Charts',               icon: 'pie_chart',      menu: this.chartsMenu,      filter: []  },
        { name: 'Animations',           icon: 'animation',      menu: this.animationsMenu,  filter: []  },
        { name: 'Navigation',           icon: 'signpost',       menu: this.navigationMenu,  filter: []  },
    ]

    panel = new SelectionModel(false);
    filter = new SelectionModel(false);

    constructor(
        private platform: PlatformService,
        private theme: ThemeService,
    ) { }

    get isMobile() { return this.platform.isMobile; }
    get isDarkMode() { return this.theme.isDarkMode; }
    get toggleTheme() { return this.theme.toggleTheme; }

    getAvailables(featureName: string) {
        return this.features.find(feature => feature.name === featureName)?.menu.filter(item => !item.disabled && item.icon).length;
    }

    getDocumented(featureName: string) {
        return this.features.find(feature => feature.name === featureName)?.menu.filter(item => item.portal && item.icon).length;
    }

    getTotal(featureName: string) {
        return this.features.find(feature => feature.name === featureName)?.menu.filter(item => item.icon).length;
    }

    filterMenu(options: MenuOption[]) {
        const menu = options.filter(item => !!item.icon);
        if (this.filter.isEmpty()) return menu;
        else return menu.filter(item => this.filter.selected.includes(item.tag));
    }
}
