const fs = require("fs");
const path = require("path");
const Product = require("../models/product");
const Order = require("../models/order");
const mongodb = require("mongodb");
const pdfkit = require("pdfkit");
const throwErrorAndRedirect = require("../utils/throwErrorAndRedirect");
const { default: mongoose } = require("mongoose");
const { PAGINATION_ITEMS_PER_PAGE } = require("../config/config");
const { calculateProductsSum } = require("../utils/products");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getIndex = async (req, res, next) => {
  const page = req.query.page || 1;
  console.log("page is", page);

  try {
    const productsCount = await Product.countDocuments();
    console.log("productsCount", productsCount);

    console.log("page is", page);
    console.log({
      totalProducts: productsCount,
      currentPage: +page,
      hasNextPage: PAGINATION_ITEMS_PER_PAGE * page < productsCount,
      hasPreviousPage: page > 1,
      nextPage: +page + 1,
      previousPage: +page - 1,
      lastPage: Math.ceil(productsCount / PAGINATION_ITEMS_PER_PAGE),
    });

    const products = await Product.find()
      .skip((page - 1) * PAGINATION_ITEMS_PER_PAGE)
      .limit(PAGINATION_ITEMS_PER_PAGE);
    return res.render("shop/index", {
      prods: products,
      docTitle: "All Products",
      path: "/",
      currentPage: page,
      hasNextPage: PAGINATION_ITEMS_PER_PAGE * page < productsCount,
      hasPreviousPage: page > 1,
      nextPage: +page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(productsCount / PAGINATION_ITEMS_PER_PAGE),
    });
  } catch (err) {
    console.log("@@@ERROR getIndex shop controller", err);
    throwErrorAndRedirect(`Error getIndex SHOP ${err}`, 500, next);
  }
};

const getProducts = async (req, res, next) => {
  const page = req.query.page || 1;
  console.log("page is", page);

  try {
    const productsCount = await Product.countDocuments();
    console.log("productsCount", productsCount);

    console.log("page is", page);
    console.log({
      totalProducts: productsCount,
      currentPage: +page,
      hasNextPage: PAGINATION_ITEMS_PER_PAGE * page < productsCount,
      hasPreviousPage: page > 1,
      nextPage: +page + 1,
      previousPage: +page - 1,
      lastPage: Math.ceil(productsCount / PAGINATION_ITEMS_PER_PAGE),
    });

    const products = await Product.find()
      .skip((page - 1) * PAGINATION_ITEMS_PER_PAGE)
      .limit(PAGINATION_ITEMS_PER_PAGE);
    return res.render("shop/product-list", {
      prods: products,
      docTitle: "All Products",
      path: "/products",
      currentPage: page,
      hasNextPage: PAGINATION_ITEMS_PER_PAGE * page < productsCount,
      hasPreviousPage: page > 1,
      nextPage: +page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(productsCount / PAGINATION_ITEMS_PER_PAGE),
    });
  } catch (err) {
    console.log("@@@ERROR getIndex shop controller", err);
    throwErrorAndRedirect(`Error getIndex SHOP ${err}`, 500, next);
  }
};

const getProduct = async (req, res, next) => {
  const { productId } = req.params;
  console.log("productid is", productId);

  if (!productId) {
    console.log("didnt received productId on req.params", productId);
    return res.redirect("/");
  }
  try {
    const product = await Product.findById(productId);
    console.log("product received back", product);
    return res.render("shop/product-detail", {
      product: product,
      docTitle: product?.title,
      path: "/products",
    });
  } catch (err) {
    console.log("@@@ERROR getProducts shop controller", err);
    throwErrorAndRedirect(
      `Error getProducts SHOP for productId ${productId} ${err}`,
      500,
      next
    );
  }
};

const postCart = async (req, res, next) => {
  console.log("postCart req.user is", req.user);
  const prodId = req.body.productId;
  if (!prodId) {
    return res.redirect("/");
  }

  try {
    const product = await Product.findById(prodId).exec();
    if (!product) {
      console.log("no product found...", product);
      return res.redirect("/");
    }

    const responseAddToCart = await req.user.addToCart(product);
    console.log("responseAddToCart", responseAddToCart);
    if (responseAddToCart) {
      return res.redirect("/");
    }
  } catch (err) {
    console.log("@@@ERROR postCart shop controller", err);
    throwErrorAndRedirect(
      `Error postCart SHOP for productId ${prodId} ${err}`,
      500,
      next
    );
  }
};

const getCart = (req, res, next) => {
  console.log(req.user.addToCart);
  console.log(req.user.getCart);
  return (
    req.user
      // .getCart()
      .populate("cart.items.productId") // modified cart.ejs because productId is now toplevel
      .then((products) => {
        console.log("products getCart shop controller", products.cart.items);

        res.render("shop/cart", {
          docTitle: "Your Cart",
          path: "/cart",
          products: products.cart.items,
        });
      })
      .catch((err) => {
        console.log("getCart error shop controller", err);
        throwErrorAndRedirect(
          `Error getCart SHOP for userId ${req.user._id} ${err}`,
          500,
          next
        );
      })
  );
};

const postCartDeleteProduct = (req, res, next) => {
  console.log("hit route /cart-delete-item");
  // remove the product only from the cart, not from the products.json
  const { productId } = req.body;

  if (!productId) {
    console.log(
      "didnt received productId on body => redirect to /cart",
      productId
    );
    return res.redirect("/cart");
  }

  req.user
    .deleteItemFromCart(productId)
    .then((products) => {
      console.log("products remaining", products);
      res.redirect("/cart");
    })
    .catch((err) => {
      console.log("@@@SHOP CONTROLLER err deleteItemFromCart", err);
      throwErrorAndRedirect(
        `Error getCart SHOP for userId ${req.user._id} ${err}`,
        500,
        next
      );
    });
};

const getCheckout = async (req, res, next) => {
  try {
    const cartItemsByProdIds = await req.user.populate("cart.items.productId");

    if (!cartItemsByProdIds) {
      return throwErrorAndRedirect(
        `Error getCheckout SHOP for userId ${req.user._id} ${err}`,
        500,
        next
      );
    }

    const { items: products } = cartItemsByProdIds?.cart || [];
    console.log("items", products);
    const totalSum = calculateProductsSum(products);

    // create stripe session
    const sessionResponse = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: products.map((p) => {
        return {
          name: p.productId.title,
          description: p.productId.description,
          amount: p.productId.price * 100,
          currency: "ron",
          quantity: p.quantity,
        };
      }),
      success_url: req.protocol + "://" + req.get("host") + "/checkout/success",
      cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel",
    });
    console.log("sessionRespose", sessionResponse);
    if (sessionResponse) {
      return res.render("shop/checkout", {
        docTitle: "Checkout",
        path: "/checkout",
        products: products,
        totalSum: totalSum,
        sessionId: sessionResponse.id,
      });
    }
  } catch (err) {
    console.log("@@@SHOP CONTROLLER err getCheckout", err);
    throwErrorAndRedirect(
      `Error getCart SHOP for userId ${req.user._id} ${err}`,
      500,
      next
    );
  }
};

const getOrders = async (req, res, next) => {
  // get the orders for this userID
  console.log("req.user", req.user);

  try {
    // get all the users for the userId
    // const responseOrders = await Order.find({ "user.userId": req.user._id });
    let responseOrders = await Order.find({
      "user.userId": req.session.user._id,
    });
    console.log("responseOrders before", responseOrders);
    responseOrders = responseOrders?.map((order) => {
      let sum = 0;

      order?.products?.reduce(
        (_, el) => (sum += el?.quantity * el?.product?.price),
        0
      );

      return {
        ...order._doc,
        sum: sum,
      };
    });
    console.log("responseOrders after", responseOrders);

    if (responseOrders) {
      return res.render("shop/orders", {
        docTitle: "Your Orders",
        path: "/orders",
        orders: responseOrders,
      });
    }
  } catch (err) {
    console.log("@@@ERROR GET ORDER SHOP CONTROLLER", err);
    throwErrorAndRedirect(
      `Error getOrders SHOP for userId ${req.user._id} ${err}`,
      500,
      next
    );
  }
};

const postOrder = async (req, res, next) => {
  console.log("req.user", req.user);
  try {
    let products = await req.user.populate("cart.items.productId");

    if (products) {
      // return the correct format
      products = products.cart.items.map((i) => {
        return {
          quantity: i.quantity,
          product: { ...i.productId._doc },
        };
      });
      console.log("@@products", products);

      // const order = new Order({
      //   user: {
      //     name: req.user.name,
      //     email: req.user.email,
      //     userId: req.user._id,
      //   },
      //   products: products,
      // });
      const order = new Order({
        user: {
          email: req.session.user.email,
          userId: req.session.user._id,
        },
        products: products,
      });

      const respSaveOrder = await order.save();
      console.log("respSaveOrder", respSaveOrder);
      if (respSaveOrder) {
        const responseClearCart = await req.user.clearCart();
        console.log("responseClearCart", responseClearCart);
        if (responseClearCart) {
          return res.redirect("/");
        }
      }
    }
  } catch (err) {
    console.log("@@@ERROR postOrder shop controller", err);
    throwErrorAndRedirect(
      `Error postOrder SHOP for userId ${req.user._id} ${err}`,
      500,
      next
    );
  }
};

const getInvoice = async (req, res, next) => {
  const { orderId } = req.params;

  console.log("orderId", orderId);

  if (!orderId) {
    console.log("@@@ERROR getInvoice, didnt received orderid", orderId);
    return throwErrorAndRedirect(
      `Error getInvoice, no orderId provided`,
      500,
      next
    );
  }

  // check if the user can download this invoice
  try {
    const findOrderById = await Order.findOne({
      _id: mongoose.Types.ObjectId(orderId),
    }).exec();

    if (!findOrderById) {
      return throwErrorAndRedirect(
        `No order found for orderId ${orderId}`,
        401,
        next
      );
    }

    let { userId } = findOrderById?.user || null;

    if (userId?.toString() !== req?.user?._id?.toString()) {
      return throwErrorAndRedirect(`This action is forbidden!`, 403, next);
    }

    const invoiceName = "invoice-" + orderId + ".pdf";
    const invoicePath = path.join("data", "invoices", invoiceName);

    // creating PDF on the fly
    const pdfDoc = new pdfkit();
    pdfDoc.pipe(fs.createWriteStream(invoicePath)); // create doc
    pdfDoc.pipe(res); // forward to response

    pdfDoc.fontSize(24).text("Invoice");
    pdfDoc.text("-------------");
    const { products } = findOrderById || [];

    // calculate the total price based on products price * quantity
    let totalPrice = 0;
    products.reduce((_, el) => {
      console.log("totalPrice IS", totalPrice);
      totalPrice += el.product.price * el.quantity;
      return pdfDoc.fontSize(14).text(`
          ${el?.product?.title} (${el?.quantity}) x $${el?.product?.price}
      `);
    }, 0);
    pdfDoc.text("---------");
    pdfDoc.fontSize(20).text(`Total Order: ${totalPrice}`);
    pdfDoc.end(); // end and send the response

    // fs.readFile(invoicePath, (err, data) => {
    //   if (err) {
    //     console.log("error readfile", err);
    //     return throwErrorAndRedirect(
    //       `Error getInvoice, readingFile`,
    //       500,
    //       next
    //     );
    //   }

    //   console.log("data", data);
    //   res.setHeader("Content-Type", "application/pdf");
    //   res.setHeader(
    //     "Content-Disposition",
    //     // 'attachment; filename="' + invoiceName + '"'
    //     'inline; filename="' + invoiceName + '"'
    //   );
    //   res.send(data);
    // });

    // using readStream
    // const file = fs.createReadStream(invoicePath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="' + invoiceName + '"'
    );

    // console.log("file", file);
    // file.pipe(res);
  } catch (error) {
    console.log("@@@ERROR getInvoice shop controller", error);
    return throwErrorAndRedirect(`Error getInvoice ${error}`, 500, next);
  }
};

const getCheckoutSuccess = async (req, res, next) => {
  console.log("req.user", req.user);
  try {
    let products = await req.user.populate("cart.items.productId");

    if (products) {
      // return the correct format
      products = products.cart.items.map((i) => {
        return {
          quantity: i.quantity,
          product: { ...i.productId._doc },
        };
      });
      console.log("@@products", products);

      const order = new Order({
        user: {
          email: req.session.user.email,
          userId: req.session.user._id,
        },
        products: products,
      });

      const respSaveOrder = await order.save();
      console.log("respSaveOrder", respSaveOrder);
      if (respSaveOrder) {
        const responseClearCart = await req.user.clearCart();
        console.log("responseClearCart", responseClearCart);
        if (responseClearCart) {
          return res.redirect("/orders");
        }
      }
    }
  } catch (err) {
    console.log("@@@ERROR postOrder shop controller", err);
    throwErrorAndRedirect(
      `Error postOrder SHOP for userId ${req.user._id} ${err}`,
      500,
      next
    );
  }
};

module.exports = {
  getProducts,
  getIndex,
  getCart,
  getCheckout,
  getOrders,
  getProduct,
  postCart,
  postCartDeleteProduct,
  postOrder,
  getInvoice,
  getCheckoutSuccess,
};
