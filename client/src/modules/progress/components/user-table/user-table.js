import { Table } from 'semantic-ui-react';

const { Header, Body, Row, HeaderCell, Cell } = Table;

const columns = [
  {
    header: 'User',
    value: d => d.user.login
  }
];

export const UserTable = ({ users }) => {
  console.log(users);

  return (
    <Table>
      <Header>
        <Row>
          { columns.map(column => 
            <HeaderCell>{ column.header }</HeaderCell>
          )}
        </Row>        
      </Header>
      <Body>
        { users.map((user, i) =>
          <Row key={ i }>
            { columns.map((column, i) => 
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