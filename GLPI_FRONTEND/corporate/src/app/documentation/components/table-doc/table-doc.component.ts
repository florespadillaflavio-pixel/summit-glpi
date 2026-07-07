import { SelectionModel } from '@angular/cdk/collections';
import { Component, ViewChild } from '@angular/core';
import { expandY, fadeSwitch } from '@app/shared/animations';
import { AppPaginator } from '@app/shared/material/paginator';
import { AppSort } from '@app/shared/material/sort';
import { AppTable, TableDataSource } from '@app/shared/material/table';

interface PeriodicElement {
    name: string;
    position: number;
    weight: number;
    symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
    { position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H' },
    { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He' },
    { position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li' },
    { position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be' },
    { position: 5, name: 'Boron', weight: 10.811, symbol: 'B' },
    { position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C' },
    { position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N' },
    { position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O' },
    { position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F' },
    { position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne' },
];

interface PeriodicElement5 {
    name: string;
    position: number;
    weight: number;
    symbol: string;
    description: string;
}

const ELEMENT_DATA5: PeriodicElement5[] = [
    {
        position: 1,
        name: 'Hydrogen',
        weight: 1.0079,
        symbol: 'H',
        description: `Hydrogen is a chemical element with symbol H and atomic number 1. With a standard
            atomic weight of 1.008, hydrogen is the lightest element on the periodic table.`,
    },
    {
        position: 2,
        name: 'Helium',
        weight: 4.0026,
        symbol: 'He',
        description: `Helium is a chemical element with symbol He and atomic number 2. It is a
            colorless, odorless, tasteless, non-toxic, inert, monatomic gas, the first in the noble gas
            group in the periodic table. Its boiling point is the lowest among all the elements.`,
    },
    {
        position: 3,
        name: 'Lithium',
        weight: 6.941,
        symbol: 'Li',
        description: `Lithium is a chemical element with symbol Li and atomic number 3. It is a soft,
            silvery-white alkali metal. Under standard conditions, it is the lightest metal and the
            lightest solid element.`,
    },
    {
        position: 4,
        name: 'Beryllium',
        weight: 9.0122,
        symbol: 'Be',
        description: `Beryllium is a chemical element with symbol Be and atomic number 4. It is a
            relatively rare element in the universe, usually occurring as a product of the spallation of
            larger atomic nuclei that have collided with cosmic rays.`,
    },
    {
        position: 5,
        name: 'Boron',
        weight: 10.811,
        symbol: 'B',
        description: `Boron is a chemical element with symbol B and atomic number 5. Produced entirely
            by cosmic ray spallation and supernovae and not by stellar nucleosynthesis, it is a
            low-abundance element in the Solar system and in the Earth's crust.`,
    },
    {
        position: 6,
        name: 'Carbon',
        weight: 12.0107,
        symbol: 'C',
        description: `Carbon is a chemical element with symbol C and atomic number 6. It is nonmetallic
            and tetravalent—making four electrons available to form covalent chemical bonds. It belongs
            to group 14 of the periodic table.`,
    },
    {
        position: 7,
        name: 'Nitrogen',
        weight: 14.0067,
        symbol: 'N',
        description: `Nitrogen is a chemical element with symbol N and atomic number 7. It was first
            discovered and isolated by Scottish physician Daniel Rutherford in 1772.`,
    },
    {
        position: 8,
        name: 'Oxygen',
        weight: 15.9994,
        symbol: 'O',
        description: `Oxygen is a chemical element with symbol O and atomic number 8. It is a member of
            the chalcogen group on the periodic table, a highly reactive nonmetal, and an oxidizing
            agent that readily forms oxides with most elements as well as with other compounds.`,
    },
    {
        position: 9,
        name: 'Fluorine',
        weight: 18.9984,
        symbol: 'F',
        description: `Fluorine is a chemical element with symbol F and atomic number 9. It is the
            lightest halogen and exists as a highly toxic pale yellow diatomic gas at standard
            conditions.`,
    },
    {
        position: 10,
        name: 'Neon',
        weight: 20.1797,
        symbol: 'Ne',
        description: `Neon is a chemical element with symbol Ne and atomic number 10. It is a noble gas.
            Neon is a colorless, odorless, inert monatomic gas under standard conditions, with about
            two-thirds the density of air.`,
    },
];

interface Transaccion {
    producto: string;
    precio: number;
}

const PERIODIC_TABLE = [
    { position: 1, name: 'Hydrogen', weight: 1.008, symbol: 'H' },
    { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He' },
    { position: 3, name: 'Lithium', weight: 6.94, symbol: 'Li' },
    { position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be' },
    { position: 5, name: 'Boron', weight: 10.81, symbol: 'B' },
    { position: 6, name: 'Carbon', weight: 12.011, symbol: 'C' },
    { position: 7, name: 'Nitrogen', weight: 14.007, symbol: 'N' },
    { position: 8, name: 'Oxygen', weight: 15.999, symbol: 'O' },
    { position: 9, name: 'Fluorine', weight: 18.998, symbol: 'F' },
    { position: 10, name: 'Neon', weight: 20.180, symbol: 'Ne' },
    { position: 11, name: 'Sodium', weight: 22.990, symbol: 'Na' },
    { position: 12, name: 'Magnesium', weight: 24.305, symbol: 'Mg' },
    { position: 13, name: 'Aluminum', weight: 26.982, symbol: 'Al' },
    { position: 14, name: 'Silicon', weight: 28.085, symbol: 'Si' },
    { position: 15, name: 'Phosphorus', weight: 30.974, symbol: 'P' },
    { position: 16, name: 'Sulfur', weight: 32.06, symbol: 'S' },
    { position: 17, name: 'Chlorine', weight: 35.45, symbol: 'Cl' },
    { position: 18, name: 'Argon', weight: 39.948, symbol: 'Ar' },
    { position: 19, name: 'Potassium', weight: 39.098, symbol: 'K' },
    { position: 20, name: 'Calcium', weight: 40.078, symbol: 'Ca' },
    { position: 21, name: 'Scandium', weight: 44.956, symbol: 'Sc' },
    { position: 22, name: 'Titanium', weight: 47.867, symbol: 'Ti' },
    { position: 23, name: 'Vanadium', weight: 50.942, symbol: 'V' },
    { position: 24, name: 'Chromium', weight: 51.996, symbol: 'Cr' },
    { position: 25, name: 'Manganese', weight: 54.938, symbol: 'Mn' },
    { position: 26, name: 'Iron', weight: 55.845, symbol: 'Fe' },
    { position: 27, name: 'Cobalt', weight: 58.933, symbol: 'Co' },
    { position: 28, name: 'Nickel', weight: 58.693, symbol: 'Ni' },
    { position: 29, name: 'Copper', weight: 63.546, symbol: 'Cu' },
    { position: 30, name: 'Zinc', weight: 65.38, symbol: 'Zn' },
    { position: 31, name: 'Gallium', weight: 69.723, symbol: 'Ga' },
    { position: 32, name: 'Germanium', weight: 72.63, symbol: 'Ge' },
    { position: 33, name: 'Arsenic', weight: 74.922, symbol: 'As' },
    { position: 34, name: 'Selenium', weight: 78.971, symbol: 'Se' },
    { position: 35, name: 'Bromine', weight: 79.904, symbol: 'Br' },
    { position: 36, name: 'Krypton', weight: 83.798, symbol: 'Kr' },
    { position: 37, name: 'Rubidium', weight: 85.468, symbol: 'Rb' },
    { position: 38, name: 'Strontium', weight: 87.62, symbol: 'Sr' },
    { position: 39, name: 'Yttrium', weight: 88.906, symbol: 'Y' },
    { position: 40, name: 'Zirconium', weight: 91.224, symbol: 'Zr' },
    { position: 41, name: 'Niobium', weight: 92.906, symbol: 'Nb' },
    { position: 42, name: 'Molybdenum', weight: 95.95, symbol: 'Mo' },
    { position: 43, name: 'Technetium', weight: 98, symbol: 'Tc' },
    { position: 44, name: 'Ruthenium', weight: 101.07, symbol: 'Ru' },
    { position: 45, name: 'Rhodium', weight: 102.91, symbol: 'Rh' },
    { position: 46, name: 'Palladium', weight: 106.42, symbol: 'Pd' },
    { position: 47, name: 'Silver', weight: 107.87, symbol: 'Ag' },
    { position: 48, name: 'Cadmium', weight: 112.41, symbol: 'Cd' },
    { position: 49, name: 'Indium', weight: 114.82, symbol: 'In' },
    { position: 50, name: 'Tin', weight: 118.71, symbol: 'Sn' },
    { position: 51, name: 'Antimony', weight: 121.76, symbol: 'Sb' },
    { position: 52, name: 'Tellurium', weight: 127.60, symbol: 'Te' },
    { position: 53, name: 'Iodine', weight: 126.90, symbol: 'I' },
    { position: 54, name: 'Xenon', weight: 131.29, symbol: 'Xe' },
    { position: 55, name: 'Cesium', weight: 132.91, symbol: 'Cs' },
    { position: 56, name: 'Barium', weight: 137.33, symbol: 'Ba' },
    { position: 57, name: 'Lanthanum', weight: 138.91, symbol: 'La' },
    { position: 58, name: 'Cerium', weight: 140.12, symbol: 'Ce' },
    { position: 59, name: 'Praseodymium', weight: 140.91, symbol: 'Pr' },
    { position: 60, name: 'Neodymium', weight: 144.24, symbol: 'Nd' },
    { position: 61, name: 'Promethium', weight: 145, symbol: 'Pm' },
    { position: 62, name: 'Samarium', weight: 150.36, symbol: 'Sm' },
    { position: 63, name: 'Europium', weight: 151.96, symbol: 'Eu' },
    { position: 64, name: 'Gadolinium', weight: 157.25, symbol: 'Gd' },
    { position: 65, name: 'Terbium', weight: 158.93, symbol: 'Tb' },
    { position: 66, name: 'Dysprosium', weight: 162.50, symbol: 'Dy' },
    { position: 67, name: 'Holmium', weight: 164.93, symbol: 'Ho' },
    { position: 68, name: 'Erbium', weight: 167.26, symbol: 'Er' },
    { position: 69, name: 'Thulium', weight: 168.93, symbol: 'Tm' },
    { position: 70, name: 'Ytterbium', weight: 173.05, symbol: 'Yb' },
    { position: 71, name: 'Lutetium', weight: 174.97, symbol: 'Lu' },
    { position: 72, name: 'Hafnium', weight: 178.49, symbol: 'Hf' },
    { position: 73, name: 'Tantalum', weight: 180.95, symbol: 'Ta' },
    { position: 74, name: 'Tungsten', weight: 183.84, symbol: 'W' },
    { position: 75, name: 'Rhenium', weight: 186.21, symbol: 'Re' },
    { position: 76, name: 'Osmium', weight: 190.23, symbol: 'Os' },
    { position: 77, name: 'Iridium', weight: 192.22, symbol: 'Ir' },
    { position: 78, name: 'Platinum', weight: 195.08, symbol: 'Pt' },
    { position: 79, name: 'Gold', weight: 196.97, symbol: 'Au' },
    { position: 80, name: 'Mercury', weight: 200.59, symbol: 'Hg' },
    { position: 81, name: 'Thallium', weight: 204.38, symbol: 'Tl' },
    { position: 82, name: 'Lead', weight: 207.2, symbol: 'Pb' },
    { position: 83, name: 'Bismuth', weight: 208.98, symbol: 'Bi' },
    { position: 84, name: 'Polonium', weight: 209, symbol: 'Po' },
    { position: 85, name: 'Astatine', weight: 210, symbol: 'At' },
    { position: 86, name: 'Radon', weight: 222, symbol: 'Rn' },
    { position: 87, name: 'Francium', weight: 223, symbol: 'Fr' },
    { position: 88, name: 'Radium', weight: 226, symbol: 'Ra' },
    { position: 89, name: 'Actinium', weight: 227, symbol: 'Ac' },
    { position: 90, name: 'Thorium', weight: 232.04, symbol: 'Th' },
    { position: 91, name: 'Protactinium', weight: 231.04, symbol: 'Pa' },
    { position: 92, name: 'Uranium', weight: 238.03, symbol: 'U' },
    { position: 93, name: 'Neptunium', weight: 237, symbol: 'Np' },
    { position: 94, name: 'Plutonium', weight: 244, symbol: 'Pu' },
    { position: 95, name: 'Americium', weight: 243, symbol: 'Am' },
    { position: 96, name: 'Curium', weight: 247, symbol: 'Cm' },
    { position: 97, name: 'Berkelium', weight: 247, symbol: 'Bk' },
    { position: 98, name: 'Californium', weight: 251, symbol: 'Cf' },
    { position: 99, name: 'Einsteinium', weight: 252, symbol: 'Es' },
    { position: 100, name: 'Fermium', weight: 257, symbol: 'Fm' },
    { position: 101, name: 'Mendelevium', weight: 258, symbol: 'Md' },
    { position: 102, name: 'Nobelium', weight: 259, symbol: 'No' },
    { position: 103, name: 'Lawrencium', weight: 266, symbol: 'Lr' },
    { position: 104, name: 'Rutherfordium', weight: 267, symbol: 'Rf' },
    { position: 105, name: 'Dubnium', weight: 270, symbol: 'Db' },
    { position: 106, name: 'Seaborgium', weight: 271, symbol: 'Sg' },
    { position: 107, name: 'Bohrium', weight: 270, symbol: 'Bh' },
    { position: 108, name: 'Hassium', weight: 277, symbol: 'Hs' },
    { position: 109, name: 'Meitnerium', weight: 278, symbol: 'Mt' },
    { position: 110, name: 'Darmstadtium', weight: 281, symbol: 'Ds' },
    { position: 111, name: 'Roentgenium', weight: 282, symbol: 'Rg' },
    { position: 112, name: 'Copernicium', weight: 285, symbol: 'Cn' },
    { position: 113, name: 'Nihonium', weight: 286, symbol: 'Nh' },
    { position: 114, name: 'Flerovium', weight: 289, symbol: 'Fl' },
    { position: 115, name: 'Moscovium', weight: 290, symbol: 'Mc' },
    { position: 116, name: 'Livermorium', weight: 293, symbol: 'Lv' },
    { position: 117, name: 'Tennessine', weight: 294, symbol: 'Ts' },
    { position: 118, name: 'Oganesson', weight: 294, symbol: 'Og' }
];

@Component({
    selector: 'app-table-doc',
    templateUrl: './table-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class TableDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }

    // Example 1, 2, 3, 4, 5, 6, 8

    columns: string[] = ['position', 'name', 'weight', 'symbol'];
    headers: string[] = ['N°', 'Name', 'Weight', 'Symbol'];

    // Example 1, 3

    staticDataSource = ELEMENT_DATA;

    // Example 2, 4

    dataSource = new TableDataSource(ELEMENT_DATA);

    // Example 3

    @ViewChild('tabla') table: AppTable<PeriodicElement>;

    addFila() {
        const randomElementIndex = Math.floor(Math.random() * ELEMENT_DATA.length);
        this.staticDataSource.push(ELEMENT_DATA[randomElementIndex]);
        this.table.renderRows();
    }

    removeFila() {
        this.staticDataSource.pop();
        this.table.renderRows();
    }

    // Example 4

    dataSource4 = new TableDataSource(ELEMENT_DATA);
    
    addFila2() {
        const randomIndex = Math.floor(Math.random() * ELEMENT_DATA.length);
        this.dataSource4.data = [...this.dataSource4.data, ELEMENT_DATA[randomIndex]];
    }

    removeFila2() {
        this.dataSource4.data = this.dataSource4.data.slice(0, -1);
    }

    // Example 5

    columnsExpand: string[] = [...this.columns, 'expand'];
    dataSource5 = new TableDataSource(ELEMENT_DATA5);
    selection = new SelectionModel(false);

    // Example 6

    dataSource6 = new TableDataSource(ELEMENT_DATA);

    aplicarFiltro(filtro: string) {
        this.dataSource6.filter = filtro;
    }

    // Example 7, 8, 9

    columnas: string[] = ['producto', 'precio'];
    transacciones: Transaccion[] = [
        { producto: 'Pelota de Playa', precio: 16 },
        { producto: 'Toalla', precio: 20 },
        { producto: 'Frisbee', precio: 8 },
        { producto: 'Bloqueador', precio: 16 },
        { producto: 'Cooler', precio: 100 },
        { producto: 'Ropa de baño', precio: 60 },
    ];

    get costoTotal() {
        return this.transacciones.map(t => t.precio).reduce((pre, cur) => pre + cur, 0);
    }

    // Example 10, 11, 12

    ngAfterViewInit() {
        this.dataSource10.paginator = this.paginator10;
        this.dataSource11.paginator = this.paginator11;
        this.dataSource12.paginator = this.paginator12;
        this.dataSource12.sort = this.sort;
    }

    // Example 10

    dataSource10 = new TableDataSource(PERIODIC_TABLE);

    @ViewChild('paginator10') paginator10: AppPaginator;

    // Example 11

    dataSource11 = new TableDataSource(PERIODIC_TABLE);

    @ViewChild('paginator11') paginator11: AppPaginator;

    onFilter11(filtro: string) {
        this.dataSource11.filter = filtro;
    }

    // Example 12

    dataSource12 = new TableDataSource(PERIODIC_TABLE);

    @ViewChild('paginator12') paginator12: AppPaginator;
    @ViewChild('sort', { read: AppSort }) sort: AppSort;

    onFilter12(filtro: string) {
        this.dataSource12.filter = filtro;
    }

    // Example 13

    columnsSelect: string[] = ['select', ...this.columns];
    dataSource13 = new TableDataSource(ELEMENT_DATA);
    selection13 = new SelectionModel(true);

    isAllSelected() {
        const numSelected = this.selection13.selected.length;
        const numRows = this.dataSource13.data.length;
        return numSelected === numRows;
    }

    toggleAllRows() {
        if (this.isAllSelected()) this.selection13.clear();
        else this.selection13.select(...this.dataSource13.data);
    }

    deleteSelected() {
        const data = this.dataSource13.data;
        const selected = this.selection13.selected;
        this.dataSource13.data = data.filter(item => !selected.includes(item));
        this.selection13.clear();
    }

    // Example 14
    columnsActions: string[] = [
        'position',
        'name', 'weight', 'symbol',
        'name', 'weight', 'symbol',
        'name', 'weight', 'symbol',
        'name', 'weight', 'symbol',
        'actions'
    ];
}
