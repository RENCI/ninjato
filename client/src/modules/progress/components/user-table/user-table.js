import { useState, useMemo } from 'react';
import { Table } from 'semantic-ui-react';
import { scaleLinear } from 'd3-scale';
import * as chromatic from 'd3-scale-chromatic';

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
      type: 'numeric',
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

  console.log(data);
  console.log(times);

  const maxValue = useMemo(() => (
    data.reduce((maxValue, user) => Math.max(maxValue, user[times[0]]), 0)
  ), [data]);

  const countScale = scaleLinear()
    .domain([0, maxValue])
    .range([0, 1]);

  //const colorScale = scaleSequential(schemeGreen);

  //chromatic.interpolateGreen(countScale(0.5))

  console.log(chromatic);

  const onColumnClick = column => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
    }
    else {
      setSortDirection(column.type === 'text' ? 'ascending' : 'descending');
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
                <Cell key={ i } style={{ background: chromatic.interpolateGreens(countScale(user[column.value])) }}>
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