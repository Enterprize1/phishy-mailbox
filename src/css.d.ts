// Allow side-effect imports of plain CSS files. Required under
// `moduleResolution: "bundler"` (TS 6), which otherwise can't find a
// declaration for `import './foo.css'`-style imports.
declare module '*.css';
