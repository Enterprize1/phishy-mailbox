'use client';

import {FieldProps} from './common';
import dynamic from 'next/dynamic';
import '@uiw/react-textarea-code-editor/dist.css';

const CodeEditor = dynamic(() => import('@uiw/react-textarea-code-editor').then((mod) => mod.default) as any, {
  ssr: false,
}) as any;

function CodeTextarea({on, rules}: FieldProps<string>) {
  const {
    field: {ref, ...field},
  } = on.$useController({rules: (rules ?? undefined) as never});
  return (
    <CodeEditor
      {...field}
      language='html'
      padding={15}
      className='overflow-auto rounded-md border border-gray-300 bg-white'
      style={{
        fontSize: 12,
        fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
        height: 300,
      }}
    />
  );
}

export default CodeTextarea;
