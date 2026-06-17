const express = require("express");
const router = express.Router();

const upload = require("../../middleware/images/Block/block");
const {
  addBlog,
  getBlogs,
  getSingleBlog,
  editBlogData,
  updateBlogData,
} = require("../../controllers/Blog/blog_controller");


router.post(
  "/add",
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "sub1", maxCount: 1 },
    { name: "sub2", maxCount: 1 },
  ]),
  addBlog
);


router.get("/view", getBlogs);
router.get("/:slug", getSingleBlog);
router.get("/edit/:id", editBlogData);

router.put(
  "/edit/:id",
  upload.fields([
    { name: "banner", maxCount: 1 },
    { name: "sub1", maxCount: 1 },
    { name: "sub2", maxCount: 1 },
  ]),
  updateBlogData
);

module.exports = router;
