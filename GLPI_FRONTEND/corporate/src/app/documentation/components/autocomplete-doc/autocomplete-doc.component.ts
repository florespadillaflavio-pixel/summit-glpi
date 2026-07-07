import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';
import { TableDataSource } from '@app/shared/material/table';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export interface GrupoDepartamento {
    letra: string;
    departamentos: string[];
}

@Component({
    selector: 'app-autocomplete-doc',
    templateUrl: './autocomplete-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class AutocompleteDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    numero = new FormControl('');

    opciones: string[] = ['Cero', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'];
    dsOpciones = new TableDataSource<string>();
    opciones$ = this.dsOpciones.connect();
    
    departamentoForm = this.formBuilder.group({
        departamento: new FormControl('', Validators.required),
    });

    grupos: GrupoDepartamento[] = [
        {
            letra: 'A',
            departamentos: ['Amazonas', 'Ancash', 'Apurímac', 'Arequipa', 'Ayacucho'],
        },
        {
            letra: 'C',
            departamentos: ['Cajamarca', 'Callao', 'Cusco'],
        },
        {
            letra: 'H',
            departamentos: ['Huancavelica', 'Huánuco'],
        },
        {
            letra: 'I',
            departamentos: ['Ica'],
        },
        {
            letra: 'J',
            departamentos: ['Junín'],
        },
        {
            letra: 'L',
            departamentos: ['La Libertad', 'Lambayeque', 'Lima', 'Loreto'],
        },
        {
            letra: 'M',
            departamentos: ['Madre de Dios', 'Moquegua'],
        },
        {
            letra: 'P',
            departamentos: ['Pasco', 'Piura', 'Puno'],
        },
        {
            letra: 'S',
            departamentos: ['San Martín'],
        },
        {
            letra: 'T',
            departamentos: ['Tacna', 'Tumbes'],
        },
        {
            letra: 'U',
            departamentos: ['Ucayali'],
        },
    ];

    filtroGruposDepartamento: Observable<GrupoDepartamento[]>;

    constructor(private formBuilder: FormBuilder) { }

    ngOnInit() {
        this.dsOpciones.data = this.opciones;
        this.numero.valueChanges.subscribe(value => this.dsOpciones.filter = String(value ?? ''));
        
        this.filtroGruposDepartamento = this.departamentoForm.get('departamento')!.valueChanges.pipe(
            startWith(''),
            map(value => this._filtroGrupo(value || '')),
        );
    }

    private _filtroGrupo(valor: string): GrupoDepartamento[] {
        if (valor) {
            return this.grupos
                .map(grupo => ({ letra: grupo.letra, departamentos: this._filtroDepartamento(grupo.departamentos, valor) }))
                .filter(grupo => grupo.departamentos.length > 0);
        }
        return this.grupos;
    }

    private _filtroDepartamento(opciones: string[], valor: string): string[] {
        const filtro = valor.toLowerCase();
        return opciones.filter(opcion => opcion.toLowerCase().includes(filtro));
    };

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
