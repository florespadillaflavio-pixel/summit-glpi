import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { expandY, fadeSwitch } from '@app/shared/animations';

type Genero = {
    nombre: string;
    icono: string;
}

interface Pokemon {
    value: string;
    viewValue: string;
}

interface PokemonGroup {
    disabled?: boolean;
    name: string;
    pokemon: Pokemon[];
}

@Component({
    selector: 'app-select-doc',
    templateUrl: './select-doc.component.html',
    animations: [expandY, fadeSwitch]
})
export class SelectDocComponent {
    copied = '';
    examples = new SelectionModel(true);

    generoLista: Genero[] = [
        { nombre: 'Femenino', icono: 'Female' },
        { nombre: 'Masculino', icono: 'Male' },
        { nombre: 'Otro', icono: 'transgender' },
    ];

    toppings = new FormControl('', Validators.required);
    toppingLista: string[] = ['Extra cheese', 'Mushroom', 'Onion', 'Pepperoni', 'Sausage', 'Tomato'];

    snackLista: Genero[] = [
        { nombre: 'Pizza', icono: 'local_pizza' },
        { nombre: 'Hamburguesa', icono: 'lunch_dining' },
        { nombre: 'Kebab', icono: 'kebab_dining' },
        { nombre: 'Galleta', icono: 'cookie' },
        { nombre: 'Helado', icono: 'icecream' },
    ];

    pokemonControl = new FormControl('');
    pokemonNativeControl = new FormControl('');
    pokemonGroups: PokemonGroup[] = [
        {
            name: 'Tipo Planta',
            pokemon: [
                { value: 'bulbasaur-0', viewValue: 'Bulbasaur' },
                { value: 'oddish-1', viewValue: 'Oddish' },
                { value: 'bellsprout-2', viewValue: 'Bellsprout' },
            ],
        },
        {
            name: 'Tipo Agua',
            pokemon: [
                { value: 'squirtle-3', viewValue: 'Squirtle' },
                { value: 'psyduck-4', viewValue: 'Psyduck' },
                { value: 'horsea-5', viewValue: 'Horsea' },
            ],
        },
        {
            name: 'Tipo Fuego',
            disabled: true,
            pokemon: [
                { value: 'charmander-6', viewValue: 'Charmander' },
                { value: 'vulpix-7', viewValue: 'Vulpix' },
                { value: 'flareon-8', viewValue: 'Flareon' },
        ],
        },
        {
            name: 'Tipo Psíquico',
            pokemon: [
                { value: 'mew-9', viewValue: 'Mew' },
                { value: 'mewtwo-10', viewValue: 'Mewtwo' },
            ],
        },
    ];

    mascotas = [
        { nombre: 'Ninguna', valor: null },
        { nombre: 'Perro', valor: 1 },
        { nombre: 'Gato', valor: 2 },
        { nombre: 'Pájaro', valor: 3 },
        { nombre: 'Hamster', valor: 4 },
        { nombre: 'Orangután', valor: 5 },
    ];

    onCopy(id: string) {
        this.copied = id;
        setTimeout(() => this.copied = '', 2000);
    }
}
