import React from 'react';
import { Route } from 'react-router-dom';
import contentRouteMap from '../contentRouteMap';

const RoutedContent = () => (
  <div>
    {
      Object.keys(contentRouteMap).map(id => {
        const { component } = contentRouteMap[id];
        return <Route key={`/${id}`} exact path={`/${id}`} component={component} />;
      })
    }
  </div>
);

export default RoutedContent;
