import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

import SubcategoryCreate from "../../pages/category/SubCategoryCreate/SubCategoryCreate";
import CategoryDashboard from "../../pages/category/category_dashboard";
import AddCategory from "../../pages/category/Category_Create";
import CategoryEdit from "../../pages/category/Category_Edit";

const CategoryRoutes = (
  <>
    {/* CATEGORY DASHBOARD */}
    <Route
      path="/category-view"
      element={
        <ProtectedRoute>
          <Layout>
            <CategoryDashboard />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* CREATE CATEGORY */}
    <Route
      path="/category-create"
      element={
        <ProtectedRoute>
          <Layout>
            <AddCategory />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* EDIT CATEGORY */}
    <Route
      path="/category-edit/:categoryCode"
      element={
        <ProtectedRoute>
          <Layout>
            <CategoryEdit />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* CREATE SUB CATEGORY */}
    <Route
      path="/sub-category-create/:categoryCode"
      element={
        <ProtectedRoute>
          <Layout>
            <SubcategoryCreate />
          </Layout>
        </ProtectedRoute>
      }
    />
  </>
);

export default CategoryRoutes;