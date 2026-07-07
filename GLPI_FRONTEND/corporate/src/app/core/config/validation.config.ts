export const GLOBAL_VALIDATION_MESSAGES: { [key: string]: { [error: string]: string } } = {
  email: {
    required: 'Email es obligatorio',
    email: 'Formato de email inválido'
  },
  password: {
    required: 'Contraseña es obligatoria',
    minlength: 'Mínimo 6 caracteres'
  },
  generic: {
    required: 'Este campo es obligatorio',
    minlength: 'Texto demasiado corto',
    pattern: 'Formato inválido'
  }
};
