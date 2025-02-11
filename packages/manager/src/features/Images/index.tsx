import * as React from 'react';
import { Redirect, Route, Switch, useRouteMatch } from 'react-router-dom';

import { SuspenseLoader } from 'src/components/SuspenseLoader';

const ImagesLanding = React.lazy(() => import('./ImagesLanding'));
const ImageCreate = React.lazy(
  () => import('./ImagesCreate/ImageCreateContainer')
);

export const ImagesRoutes = () => {
  const { path } = useRouteMatch();

  return (
    <React.Suspense fallback={<SuspenseLoader />}>
      <Switch>
        <Route component={ImagesLanding} exact path={path} />
        <Route component={ImageCreate} path={`${path}/create`} />
        <Redirect to="/images" />
      </Switch>
    </React.Suspense>
  );
};

export default ImagesRoutes;
