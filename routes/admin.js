const express = require("express");
const router = express.Router();
const {
  postAddProduct,
  getProducts,
  getAddProduct,
  getEditProduct,
  postEditProducts,
  deleteProduct,
} = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");
const { check, body } = require("express-validator");

// admin/add-product =>  GET
router.get("/add-product", isAuth, getAddProduct);

// admin/add-product =>  POST
router.post(
  "/add-product",
  [
    body(
      "title",
      "Please enter a Product Title with only numbers and text and at least 1 character"
    )
      .isString()
      .isLength({ min: 5 }),
    // body("imageURL", "Invalid Image URL").isURL(),
    body("price", "Invalid Product Price")
      .isFloat()
      .custom((value, { req }) => {
        if (value < 0) {
          throw new Error("Product Price cannot be negative!");
        }

        return true;
      }),
    body(
      "description",
      "Please enter a Product Description with only numbers and text and at least 5 characters"
    )
      .trim()
      .isString()
      .isLength({ min: 1, max: 400 }),
  ],
  isAuth,
  postAddProduct
);

// // admin/add-product => POST / GET
router.get("/products", isAuth, getProducts);

router.get("/edit-product/:productId", isAuth, getEditProduct);

router.post(
  "/edit-product",
  isAuth,
  [
    body(
      "title",
      "Please enter a Product Title with only numbers and text and at least 5 characters"
    )
      .isString()
      .isLength({ min: 5 }),
    // body("imageURL", "Invalid Image URL").isURL(),
    body("price", "Invalid Product Price")
      .isFloat()
      .custom((value, { req }) => {
        if (value < 0) {
          throw new Error("Product Price cannot be negative!");
        }

        return true;
      }),
    body(
      "description",
      "Please enter a Product Description with only numbers and text and at least 1 character"
    )
      .trim()
      .isString()
      .isLength({ min: 1, max: 400 }),
  ],
  postEditProducts
);

// router.post("/delete-product", isAuth, deleteProduct); //v1

router.delete("/product/:productId", isAuth, deleteProduct);

module.exports = router;
