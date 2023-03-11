'use client';
import {Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material';
import clsx from 'clsx';
import {ReactNode} from 'react';

export interface SimpleTableColumn<T> {
  header: ReactNode;
  cell: (item: T) => ReactNode;
}

export interface SimpleTableProps<T> {
  columns: SimpleTableColumn<T>[];
  items: T[];
  className?: string;
}

export const SimpleTable = <T,>({columns, items, className}: SimpleTableProps<T>) => {
  return (
    <TableContainer
      className={clsx(
        'rounded-sm border-l-[1px] border-r-[1px] border-t-[1px] border-gray-200 border-t-gray-300 shadow-md',
        className,
      )}
    >
      <Table>
        <TableHead>
          <TableRow className='rounded-md bg-gray-100 pr-4 text-sm font-medium leading-4 tracking-wider text-gray-500'>
            {columns.map((c, i) => (
              <TableCell key={i}>{c.header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell align='center' colSpan={columns.length}>
                Keine Einträge vorhanden
              </TableCell>
            </TableRow>
          )}
          {items.map((item, i) => (
            <TableRow
              key={i}
              className={clsx(
                i % 2 !== 0 && 'bg-gray-50',
                i % 2 === 0 && 'bg-white',
                'items-center align-middle text-xl font-medium text-gray-500 ',
              )}
            >
              {columns.map((c, l) => (
                <TableCell key={l}>{c.cell(item)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
