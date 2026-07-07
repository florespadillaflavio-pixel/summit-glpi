import { Validators } from '@angular/forms';

export const LOGIN_VALIDATION_CONFIG = {
  username: {
    pattern: /^[a-zA-Z0-9._]+$/,
    validators: [
      Validators.required,
      Validators.minLength(3),
      Validators.pattern(/^[a-zA-Z0-9._]+$/)
    ],
    messages: {
      required: 'El usuario es obligatorio',
      minlength: 'Mínimo 3 caracteres',
      pattern: 'Solo letras, números, puntos o guiones bajos'
    }
  },
  password: {
    validators: [
      Validators.required,
      Validators.minLength(6)
    ],
    messages: {
      required: 'La contraseña es obligatoria',
      minlength: 'Mínimo 6 caracteres'
    }
  }
};
