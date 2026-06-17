const db = require("../../config/db");

/* Insert Blog*/
const createBlog = async (data) => {
  const sql = `
    INSERT INTO blogs
    (title, slug, short_description, content, banner_image, sub_image_1, sub_image_2, category, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, data);
  return result;
};

/*Get All Published Blogs */
const getAllBlogs = async () => {
  const sql = `
    SELECT id, title, slug, short_description, banner_image, created_at
    FROM blogs
    WHERE status = 'published'
    ORDER BY created_at DESC
  `;

  const [rows] = await db.query(sql);
  return rows;
};

/*Get Single Blog By Slug*/
const getBlogBySlug = async (slug) => {
  const sql = `SELECT * FROM blogs WHERE slug = ?`;
  const [rows] = await db.query(sql, [slug]);
  return rows[0];
};

/* Update Blog */
const updateBlog = async (data, id) => {
  const sql = `
    UPDATE blogs SET
      title = ?,
      slug = ?,
      short_description = ?,
      content = ?,
      banner_image = ?,
      sub_image_1 = ?,
      sub_image_2 = ?,
      category = ?
    WHERE id = ?
  `;

  const [result] = await db.query(sql, [...data, id]);
  return result;
};

/* Get single blog (for edit) */
const getBlogById = async (id) => {
  const [rows] = await db.query(
    "SELECT * FROM blogs WHERE id = ?",
    [id]
  );
  return rows[0];
};

module.exports = {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
    updateBlog,
  getBlogById,
};
