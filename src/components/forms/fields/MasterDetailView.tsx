import {FormBuilder} from '@atmina/formbuilder';
import {ArrowDownIcon, ArrowUpIcon} from '@heroicons/react/24/solid';
import {twMerge} from 'tailwind-merge';
import {useCallback, useState} from 'react';
import {PlusIcon} from '@heroicons/react/20/solid';
import {FieldValues} from 'react-hook-form';

function MasterDetailView<T extends FieldValues>({
  on,
  detailLabel,
  children,
  defaultValue,
  reorder,
}: {
  on: FormBuilder<T[]>;
  detailLabel: (v: T) => string;
  children: (on: FormBuilder<T>) => JSX.Element;
  defaultValue: T;
  reorder?: boolean;
}) {
  const value = on.$useWatch();
  const fieldArray = on.$useFieldArray();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const removeCurrent = useCallback(() => {
    if (selectedIdx === null) return;

    if (fieldArray.fields.length === 1) {
      setSelectedIdx(null);
    } else if (selectedIdx >= fieldArray.fields.length - 1) {
      setSelectedIdx(fieldArray.fields.length - 1);
    }

    fieldArray.remove(selectedIdx);
  }, [fieldArray, selectedIdx]);

  return (
    <>
      <div className='flex h-64 rounded border border-gray-200'>
        <div className='flex w-48 flex-shrink-0 flex-col overflow-y-auto border-r border-r-gray-300'>
          {value?.map((v, i) => (
            <div
              key={i}
              className={twMerge(
                'flex border-b border-b-gray-300 px-2 py-2',
                i === selectedIdx ? 'bg-indigo-300' : 'hover:bg-indigo-200',
              )}
            >
              <button key={i} className='mr-2 flex flex-grow gap-4' type='button' onClick={() => setSelectedIdx(i)}>
                {detailLabel(v)}
              </button>
              {reorder && (
                <button
                  type='button'
                  disabled={i === 0}
                  className='disabled:invisible'
                  onClick={() => fieldArray.move(i, i - 1)}
                >
                  <ArrowUpIcon className='h-4 w-4' />
                </button>
              )}
              {reorder && (
                <button
                  type='button'
                  disabled={i === value.length - 1}
                  className='disabled:invisible'
                  onClick={() => fieldArray.move(i, i + 1)}
                >
                  <ArrowDownIcon className='h-4 w-4' />
                </button>
              )}
            </div>
          ))}
          <button
            type='button'
            className='mt-auto flex items-center p-2 hover:bg-indigo-200'
            onClick={() => fieldArray.append(defaultValue as any)}
          >
            <PlusIcon className='mb-1 h-4 w-4' />
            Neu hinzufügen
          </button>
        </div>
        <div className='flex-grow'>
          {selectedIdx === null ? (
            <div className='flex h-full items-center justify-center'>Element zum Bearbeiten links auswaehlen</div>
          ) : (
            <div
              className='flex h-full'
              key={
                // TODO: Right typing, react-hook-form sets this property
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fieldArray.fields[selectedIdx].key
              }
            >
              <div className='flex-grow p-4'>{children(on[selectedIdx])}</div>
              <button
                type='button'
                onClick={() => removeCurrent()}
                className='mr-2 mt-2 flex-grow-0 self-start text-sm text-red-600'
              >
                Entfernen
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default MasterDetailView;
