'use client';

import {FieldProps} from './common';
import dynamic from 'next/dynamic';
import '@uiw/react-textarea-code-editor/dist.css';

const CodeEditor = dynamic(() => import('@uiw/react-textarea-code-editor').then((mod) => mod.default) as any, {
  ssr: false,
}) as any;

function CodeTextarea({on, rules, language = 'html'}: FieldProps<string> & {language?: string}) {
  const {
    field: {ref, ...field},
  } = on.$useController({rules: (rules ?? undefined) as never});
  return (
    <div style={{height: 200}} className='overflow-auto rounded-md border border-gray-300'>
      <CodeEditor
        {...field}
        language={language}
        padding={15}
        style={{
          fontSize: 12,
          fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
        }}
        minHeight={180}
      />
    </div>
  );
}

export default CodeTextarea;
