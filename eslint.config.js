// eslint's recommended set plus the two globals a GNOME Shell session provides
// that this code uses. gnome-shell itself lints with far more rules
// (eslint-config-gnome); this fork does not need to meet that standard.
import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                console: 'readonly',
                global: 'readonly',
            },
        },
    },
    {
        files: ['tests/**/*.mjs'],
        languageOptions: {
            globals: globals.node,
        },
    },
];
