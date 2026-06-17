const {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  getBlogById,
  updateBlog
} = require("../../models/Blog/blog_model");

/* Add Blog */
const addBlog = async (req, res) => {
  try {
    const banner = req.files?.banner?.[0]
      ? `images/block/${req.files.banner[0].filename}`
      : null;

    const sub1 = req.files?.sub1?.[0]
      ? `images/block/${req.files.sub1[0].filename}`
      : null;

    const sub2 = req.files?.sub2?.[0]
      ? `images/block/${req.files.sub2[0].filename}`
      : null;

    await createBlog([
      req.body.title,
      req.body.slug,
      req.body.short_description,
      req.body.content,
      banner,
      sub1,
      sub2,
      req.body.category,
      "published",
    ]);

    res.status(201).json({ message: "Blog created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* Get Blogs */
const getBlogs = async (req, res) => {
  try {
    const blogs = await getAllBlogs();
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* Get Single Blog */
const getSingleBlog = async (req, res) => {
  try {
    const blog = await getBlogBySlug(req.params.slug);
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* Get blog for edit */
const editBlogData = async (req, res) => {
  try {
    const blog = await getBlogById(req.params.id);
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* Update blog */
const updateBlogData = async (req, res) => {
  try {
    const banner =
      req.files.banner?.[0].filename || req.body.old_banner;

    const sub1 =
      req.files.sub1?.[0].filename || req.body.old_sub1;

    const sub2 =
      req.files.sub2?.[0].filename || req.body.old_sub2;

    await updateBlog(
      [
        req.body.title,
        req.body.slug,
        req.body.short_description,
        req.body.content,
        banner,
        sub1,
        sub2,
        req.body.category,
      ],
      req.params.id
    );

    res.json({ message: "Blog updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addBlog,
  getBlogs,
  getSingleBlog,
   editBlogData,
  updateBlogData,
};
