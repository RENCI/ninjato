import React, { Component } from 'react';
import MainMenu from './components/MainMenu';
import RoutedContent from './components/RoutedContent';

class App extends Component {
  render() {
    return (
      <div>
        <MainMenu />
        <RoutedContent />
      </div>
    );
  }
}

export default App;
