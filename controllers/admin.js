const mongodb = require("mongodb");
const Product = require("../models/product");
const { validationResult } = require("express-validator");
const throwErrorAndRedirect = require("../utils/throwErrorAndRedirect");
const { deleteFile } = require("../utils/files");

const getAddProduct = (req, res, next) => {
  console.log("Add Product route");

  res.render("admin/edit-product", {
    docTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErros: [],
  });
};

const postAddProduct = async (req, res, next) => {
  console.log("req", req.file);
  const { title, price, description } = req.body;
  const image = req.file;
  console.log("imageimageimage", image);
  const errors = validationResult(req);
  console.log("USER REQ.USER", req.user);
  console.log("errors", errors);

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      docTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      product: {
        title,
        price,
        description,
      },
      hasError: true,
      errorMessage: "Invalid product image format!",
      validationErros: [],
    });
  }

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      docTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      product: {
        title,
        price,
        description,
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      validationErros: errors.array(),
    });
  }

  // build image url
  const imageURL = `/${image.path}`;

  try {
    const newProduct = new Product({
      title: title,
      price: price,
      description: description || "No description",
      imageURL: imageURL,
      userId: req.user._id,
    });

    await newProduct.save();
    console.log("new product save response", newProduct);
    if (newProduct) {
      return res.redirect("/admin/products");
    }
  } catch (err) {
    console.log("@@@ERROR postAddProduct", err);
    // const error = new Error(`Creating a product failed! ${err}`);
    // error.httpStatuscode = 500;
    // return next(error);
    throwErrorAndRedirect(`Creating a product failed! ${err}`, 500, next);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ userId: req.user._id }).populate(
      "userId"
    );
    console.log("products", products);
    return res.render("admin/products", {
      docTitle: "Admin Products",
      path: "/admin/products",
      prods: products,
    });
  } catch (err) {
    console.log("@@@ERROR getProducts admin controller", err);
    // const error = new Error(`Creating a product failed! ${err}`);
    // error.httpStatuscode = 500;
    // return next(error);
    throwErrorAndRedirect(`Creating a product failed! ${err}`, 500, next);
  }
};

const getEditProduct = async (req, res, next) => {
  const { productId } = req.params;
  const { edit: editMode } = req.query;
  console.log("productId", productId);

  if (!editMode) {
    console.log("didnt received editMode in query params", editMode);
    return res.redirect("/");
  }

  if (!productId) {
    console.log("didnt received productId param");
    return res.status(400).redirect("/");
  }

  try {
    const productById = await Product.findById(productId).exec();
    console.log("productById", productById);
    if (productById) {
      return res.render("admin/edit-product", {
        docTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: productById,
        hasError: false,
        errorMessage: null,
        validationErros: [],
      });
    }
    return res.redirect("/");
  } catch (err) {
    console.log("@@@ERROR getEditProduct controller", err);
    throwErrorAndRedirect(
      `Error when editing the product with id ${productId}, ${err}`,
      500,
      next
    );
  }
};

const postEditProducts = async (req, res, next) => {
  const { title, description, price, productId } = req.body;
  const image = req.file;
  console.log("productId", productId);
  const errors = validationResult(req);

  console.log("errors", errors);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      docTitle: "Add Product",
      path: "/edit/add-product",
      editing: true,
      product: {
        title,
        price,
        description,
        _id: productId,
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      validationErros: errors.array(),
    });
  }

  if (!productId) {
    console.log("Invalid request");
    return res.redirect("/admin/products");
  }

  try {
    const product = await Product.findById(productId);

    // check if the user is allowed to delete the product
    if (
      mongodb.ObjectId(product.userId).toString() !==
      mongodb.ObjectId(req.user._id).toString()
    ) {
      console.log("productId", product.userId);
      console.log("req.user.id", req.user._id);
      console.log("LOGGED IN USER CANNOT PERFORM THIS ACTION");
      return res.status(403).redirect("/");
    }

    product.title = title;
    product.description = description;
    if (image) {
      // delete the old image if another one is provided;
      const oldImgPath = product?.imageURL?.slice(1);
      console.log("oldImgPath", oldImgPath);
      deleteFile(oldImgPath);

      // this will overwrite the image if is provided;
      console.log("img is there", image);
      product.imageURL = `/${image.path}`;
    }
    product.price = price;
    await product.save();
    if (product) {
      console.log("response save", product);
      return res.redirect("/admin/products");
    }
  } catch (err) {
    console.log("@@@ERROR postEditProducts admin controller", err);
    throwErrorAndRedirect(
      `Error when POST editing the product with id ${productId}, ${err}`,
      500,
      next
    );
  }
};

const deleteProduct = async (req, res, next) => {
  const { productId } = req.params;

  if (!productId) {
    console.log("invalid request deleteProduct");
    // return res.redirect("/admin/products");
    return throwErrorAndRedirect(
      `Error deleteProduct, invalid request params`,
      500,
      next
    );
  }

  try {
    // get the imagePath from Product, fetch based on productId
    const product = await Product.findById(productId).exec();

    if (!product) {
      return throwErrorAndRedirect(
        `Error deleteProduct, no product found for productId ${productId}`,
        500,
        next
      );
    } else {
      console.log("@@@ ELSE product found");
      const imagePath = product.imageURL.slice(1);
      console.log("imagePath", imagePath);
      deleteFile(imagePath);
      const deleteResponse = await Product.deleteOne({
        _id: productId,
        userId: req.user._id,
      }); // restricting users,cannot delete products that were created by other users.
      console.log("deleteResponse", deleteResponse);
      if (deleteResponse) {
        // return res.redirect("/admin/products");
        return res.status(200).json({ message: "Success" });
      }
    }
  } catch (err) {
    console.log("@@@ERROR deleteProduct admin controller", err);
    // throwErrorAndRedirect(
    //   `Error when deleteing the product with id ${productId}, ${err}`,
    //   500,
    //   next
    // );
    return res.status(500).json({
      Message: `Error when deleteing the product with id ${productId}, ${err}`,
    });
  }
};

module.exports = {
  postAddProduct,
  getAddProduct,
  getProducts,
  getEditProduct,
  postEditProducts,
  deleteProduct,
};
