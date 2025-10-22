import MainLayout from 'layouts/MainLayout';
import Page from 'layouts/PageLayout';
import PageOne from 'pages/PageOne';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from 'routes/PrivateRoute';
import { AppRoutes } from 'routes/routes';

const App = () => {
  return (
    <MainLayout>
      <Routes>
        <Route
          index
          element={
            <PrivateRoute>
              <PageOne />
            </PrivateRoute>
          }
        />
        <Route
          path={AppRoutes.PAGE2}
          element={
            <PrivateRoute>
              <Page title="Page 2" subtitle="Subtitle">
                Content goes here
              </Page>
            </PrivateRoute>
          }
        />
        <Route
          path={AppRoutes.NOTIFICATIONS}
          element={
            <PrivateRoute>
              <Page title="Notifications" subtitle="Subtitle">
                Notifications go here...
              </Page>
            </PrivateRoute>
          }
        />
        <Route path={AppRoutes.ERROR} element={<div>ERROR</div>} />
        <Route
          path={AppRoutes.FALLBACK}
          element={<Navigate to={AppRoutes.HOME} />}
        />
      </Routes>
    </MainLayout>
  );
};

export default App;
