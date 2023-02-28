import { useContext, useState, useMemo } from 'react';
import { Table } from 'semantic-ui-react';
import { scaleLinear } from 'd3-scale';
import * as chromatic from 'd3-scale-chromatic';
import { ProgressContext } from 'contexts';
import { TableControls } from './table-controls';

const { Header, Body, Row, HeaderCell, Cell } = Table;

const columns = [
  {
    header: 'User',
    value: 'user',
    type: 'text',
    cellValue: d => d.user.login
  }
];

export const UserTable = ({ users }) => {
  const [{ tableDisplay }] = useContext(ProgressContext);
  const [sortColumn, setSortColumn] = useState(columns[0].value);
  const [sortDirection, setSortDirection] = useState('ascending');

  const times = useMemo(() => (
    users.reduce((times, user) => {
      user.counts?.forEach(count => {
        const time = count.time.getTime();
  
        if (!times.includes(time)) {
          times.push(time);
        }
      });
  
      return times;
    }, []).sort((a, b) => b - a)
  ), [users]);

  const timeColumns = useMemo(() => (
    times.map(time => ({
      header: new Date(time).toDateString(),
      value: time,
      type: 'numeric',
      cellValue: d => {
        const count = d.counts?.find(count => count.time.getTime() === time);
        return count ? count.completed : null;
      }
    }))
  ), [times]);

  const allColumns = [...columns, ...timeColumns];

  const data = useMemo(() => (
    users.filter(user => user.counts).map(user => {
      const u = {};
      allColumns.forEach(column => u[column.value] = column.cellValue(user));
      
      if (tableDisplay === 'change') {
        allColumns.forEach((column, i, a) => {
          if (i < a.length - 1 && column.type === 'numeric' && a[i + 1].type === 'numeric') {
            u[column.value] = u[column.value] - u[a[i + 1].value];
          }
        });
      }

      return u;
    })
  ), [users, allColumns, tableDisplay]);

  const maxValue = useMemo(() => (
    Math.max(...data.map(user => times.reduce((maxValue, time) => Math.max(maxValue, user[time]), 0)))
  ), [data, times]);

  const countScale = scaleLinear()
    .domain([0, maxValue])
    .range([0, 1]);

  const onColumnClick = column => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    }
    else {
      setSortDirection(column.type === 'text' ? 'ascending' : 'descending');
    }

    setSortColumn(column);
  };

  const table = columns => (
    <Table basic='very' compact sortable>
      <Header>
        <Row>
          { columns.map((column, i) => 
            <HeaderCell 
              key={ i }
              sorted={ column.value === sortColumn ? sortDirection : null } 
              onClick={ () => onColumnClick(column.value) }
            >
              { column.header }
            </HeaderCell>
          )}
        </Row>        
      </Header>
      <Body>
        { data.sort((a, b) => {
          const va = a[sortColumn];
          const vb = b[sortColumn];
          return sortDirection === 'ascending' ? (va > vb ? 1 : -1) : (va > vb ? -1 : 1);
        }).map((user, i) =>
          <Row key={ i }>
            { columns.map((column, i) => {
              switch (column.type) {
                case 'text':
                  return (
                    <Cell key={ i }>
                      { user[column.value] }
                    </Cell>
                  );
              
                case 'numeric': {                
                  const value = user[column.value];

                  return (
                    <Cell 
                      key={ i } 
                      style={{ 
                        background: column.type === 'numeric' ? chromatic.interpolateGreens(countScale(value)) : null,
                        color: column.type === 'numeric' ? (countScale(value) > 0.5 ? 'white' : null) : null
                      }}
                    >
                      { value }
                    </Cell>
                  );
                }

                default: {
                  console.warn(`Unknown column type: ${ column.type }`);
                  return null;
                }
              }
            })}
          </Row>
        )}
      </Body>
    </Table>
  );

  return (
    <>
      <TableControls />
      <div style={{ display: 'flex', marginTop: 10 }}>
        <div>
          { table(columns) }
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>      
          { table(timeColumns) }
        </div>
      </div>
    </>
  );
};