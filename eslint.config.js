'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'backups/**',
            'artifacts/**',
            'apps/**',
            'genesis/**',
            'docs/vendor/**',
            'docs/builds/**',
            'coverage/**',
            // Legacy front-end scripts for the older pages. They are
            // syntax-checked by `npm run check:syntax` but not linted yet.
            'docs/**',
            // Legacy one-off scripts kept for reference.
            'auto-start.js',
            'boot.js',
            'bootloader.js',
            'code-audit.js',
            'restore-lost-features.js',
            'security-fix.js',
            'smart-initialization.js',
            'vps-deploy.js',
            'vps-persistence.js',
            'scripts/**',
        ]
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node }
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
            'prefer-const': 'error',
            'no-var': 'error',
            'eqeqeq': ['error', 'smart']
        }
    },
    {
        // Browser-side ES modules (the experimental 3D engine) and the bundle entry.
        files: ['src/core/**/*.js', 'src/world/**/*.js', 'src/actors/**/*.js', 'src/index.js'],
        languageOptions: {
            sourceType: 'module',
            globals: { ...globals.browser }
        },
        rules: {
            'no-empty': ['error', { allowEmptyCatch: true }]
        }
    }
];
