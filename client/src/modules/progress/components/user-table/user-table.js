import { Table } from 'semantic-ui-react';

const { Header, Body, Row, HeaderCell, Cell } = Table;

const columns = [
  {
    header: 'User',
    value: d => d.user.login
  }
];

export const UserTable = ({ users }) => {
  const times = users.reduce((times, user) => {
    user.counts?.forEach(count => {
      const time = count.time.getTime();

      if (!times.includes(time)) {
        times.push(time);
      }
    });

    return times;
  }, []).sort((a, b) => b - a);

  const allColumns = [
    ...columns,
    ...times.map(time => ({
      header: new Date(time).toDateString(),
      value: d => {
        const count = d.counts?.find(count => count.time.getTime() === time);
        return count ? count.completed : '';
      }
    }))
  ];

  return (
    <Table>
      <Header>
        <Row>
          { allColumns.map((column, i) => 
            <HeaderCell key={ i }>
              { column.header }
            </HeaderCell>
          )}
        </Row>        
      </Header>
      <Body>
        { users.map((user, i) =>
          <Row key={ i }>
            { allColumns.map((column, i) => 
              <Cell key={ i }>
                { column.value(user) }
              </Cell>
            )}
          </Row>
        )}
      </Body>
    </Table>
  );
};