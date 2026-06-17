import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

import ColoursDashboard from "../../pages/colours/index";
import AddColour from "../../pages/colours/add_colour/index";
import EditColour from "../../pages/colours/edit_colour";

const ColourRoutes = (
  <>
    {/* Colours Dashboard */}
    <Route
      path="/colours"
      element={
        <ProtectedRoute>
          <Layout>
            <ColoursDashboard />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* Add Colour */}
    <Route
      path="/colours/add"
      element={
        <ProtectedRoute>
          <Layout>
            <AddColour />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* Edit Colour */}
    <Route
      path="/colours/edit/:colourCode"
      element={
        <ProtectedRoute>
          <Layout>
            <EditColour />
          </Layout>
        </ProtectedRoute>
      }
    />
  </>
);

export default ColourRoutes;