import { useState, useMemo } from 'react';
import { Table } from 'semantic-ui-react';

const { Header, Body, Row, HeaderCell, Cell } = Table;

const columns = [
  {
    header: 'User',
    value: 'user',
    cellValue: d => d.user.login
  }
];

export const UserTable = ({ users }) => {
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

  const allColumns = useMemo(() => ([
    ...columns,
    ...times.map(time => ({
      header: new Date(time).toDateString(),
      value: time,
      cellValue: d => {
        const count = d.counts?.find(count => count.time.getTime() === time);
        return count ? count.completed : null;
      }
    }))
  ]), [times]);

  const data = useMemo(() => (
    users.filter(user => user.counts).map(user => {
      const u = {};
      allColumns.forEach(column => u[column.value] = column.cellValue(user));
      return u;
    })
  ), [users, allColumns]);

  const onColumnClick = column => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    }
    else {
      setSortDirection('ascending');
    }

    setSortColumn(column);
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Table basic='very' compact sortable>
        <Header>
          <Row>
            { allColumns.map((column, i) => 
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
              { allColumns.map((column, i) => 
                <Cell key={ i }>
                  { user[column.value] }
                </Cell>
              )}
            </Row>
          )}
        </Body>
      </Table>
    </div>
  );
};