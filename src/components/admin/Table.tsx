import React from 'react';

interface Column<T> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string | number;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: string | ((record: T) => string);
  loading?: boolean;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  loading = false,
}: TableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || String(index);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider"
                style={{ color: '#5C5A52', background: '#FAF7F0', borderBottom: '1px solid #EFE9DC', width: column.width }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-4 text-center" style={{ color: '#5C5A52' }}>
                Carico…
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-4 text-center" style={{ color: '#5C5A52' }}>
                Nessun dato disponibile
              </td>
            </tr>
          ) : (
            data.map((record, index) => (
              <tr key={getRowKey(record, index)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-5 py-3 text-sm"
                    style={{ color: '#1A1A17', borderBottom: '1px solid #EFE9DC', background: '#fff' }}
                  >
                    {column.render
                      ? column.render(column.dataIndex ? record[column.dataIndex] : null, record)
                      : column.dataIndex
                      ? String(record[column.dataIndex] || '')
                      : ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
