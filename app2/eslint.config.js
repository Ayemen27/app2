// إعداد ESLint مُحسّن للمشروع العربي - React + TypeScript
export default [
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      '*.config.js',
      'audit-results/**/*',
      'attached_assets/**/*'
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        
        // React/Vite globals
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    rules: {
      // إعدادات أساسية
      'no-unused-vars': 'off', // نوقف هذا لأن TypeScript يتولاه
      'no-console': 'off', // مسموح للتطوير
      'no-undef': 'off', // TypeScript يتولى هذا
      
      // إعدادات التنسيق
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'double', { allowTemplateLiterals: true }],
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'comma-dangle': ['warn', 'always-multiline'],
      
      // إعدادات أفضل الممارسات
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      
      // إعدادات React/JSX
      'react-hooks/rules-of-hooks': 'off', // سنحتاج plugin لهذا
      'react-hooks/exhaustive-deps': 'off', // سنحتاج plugin لهذا
    },
  },
];