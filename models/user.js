const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Product = require("./product");

const userSchema = new Schema({
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },

  cart: {
    items: [
      {
        productId: {
          ref: "Product",
          type: Schema.Types.ObjectId,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  resetToken: String,
  resetTokenExpiration: Date,
});

userSchema.methods.addToCart = async function (product) {
  console.log("addToCart product", product);
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });

  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items]; // get all the elements from cart

  if (cartProductIndex >= 0) {
    console.log("PRODUCT IN CART HERE", cartProductIndex);
    // product exists => increase qty and update the cart item based on found index
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    console.log("newQuantity is", newQuantity);
    updatedCartItems[cartProductIndex].quantity = newQuantity;
    console.log("updatedCartItems here", updatedCartItems);
  } else {
    // item is not in cart, push item to cart;
    console.log("product with prodid", product, "is not in cart => add it");
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity,
    });
  }

  const updatedCart = {
    items: updatedCartItems,
  };

  console.log("updatedCart", updatedCartItems);

  this.cart = updatedCart;
  return await this.save();
};

// V1 - working. Currently implemented using populate in getCart shop controller
// userSchema.methods.getCart = async function () {
//   console.log("getCart method");

//   // get the productIds from cart
//   const productsIds = this.cart.items.map((product) => product.productId);
//   console.log("productsIds", productsIds);

//   try {
//     const products = await Product.find({ _id: { $in: productsIds } }).exec();
//     console.log("products", products);

//     let updatedProducts;
//     if (products) {
//       // get qty of every product based on his id
//       updatedProducts = products.map((p) => {
//         return {
//           ...p,
//           quantity: this.cart.items.find((i) => {
//             return i.productId.toString() === p._id.toString();
//           }).quantity,
//         };
//       });

//       console.log("updatedProducts", updatedProducts);
//       return updatedProducts;
//     }
//   } catch (error) {
//     console.log("@@@ERROR method getCart", error);
//   }
// };

userSchema.methods.deleteItemFromCart = async function (productId) {
  console.log("deleteItemFromCart args", arguments);

  const remainingItems = this.cart.items.filter(
    (p) => p.productId.toString() !== productId.toString()
  );

  console.log("remainingItems", remainingItems);

  this.cart.items = remainingItems;

  return await this.save();
};

userSchema.methods.clearCart = async function () {
  this.cart = { items: [] };

  return await this.save();
};

module.exports = mongoose.model("User", userSchema);

// const mongodb = require("mongodb");
// const { getDb } = require("../utils/database");

// class User {
//   constructor(username, email, cart, id) {
//     this.username = username;
//     this.email = email;
//     this.cart = cart; // {items : []}
//     this._id = id;
//   }

//   save() {
//     const db = getDb();
//     return db
//       .collection("users")
//       .insertOne(this)
//       .then((result) => {
//         console.log("result insert user", result);
//       })
//       .catch((err) => {
//         console.log("error insert usert", err);
//       });
//   }

//   static findUserById(userId) {
//     const db = getDb();

//     return db
//       .collection("users")
//       .find({ _id: new mongodb.ObjectId(userId) })
//       .next()
//       .then((user) => {
//         return user;
//       })
//       .catch((err) => {
//         console.log("Err findUserById for userid", userId, err);
//       });
//   }

//   addToCart(product) {
//     console.log("addToCart product", product);
//     const cartProductIndex = this.cart.items.findIndex((cp) => {
//       return cp.productId.toString() === product._id.toString();
//     });

//     let newQuantity = 1;
//     const updatedCartItems = [...this.cart.items]; // get all the elements from cart

//     if (cartProductIndex >= 0) {
//       console.log("PRODUCT IN CART HERE", cartProductIndex);
//       // product exists => increase qty and update the cart item based on found index
//       newQuantity = this.cart.items[cartProductIndex].quantity + 1;
//       console.log("newQuantity is", newQuantity);
//       updatedCartItems[cartProductIndex].quantity = newQuantity;
//       console.log("updatedCartItems here", updatedCartItems);
//     } else {
//       // item is not in cart, push item to cart;
//       updatedCartItems.push({
//         productId: new mongodb.ObjectId(product._id),
//         quantity: newQuantity,
//       });
//     }

//     const updatedCart = {
//       items: updatedCartItems,
//     };

//     console.log("updatedCart", updatedCartItems);

//     const db = getDb();
//     return db
//       .collection("users")
//       .updateOne(
//         { _id: new mongodb.ObjectId(this._id) },
//         { $set: { cart: updatedCart } }
//       );
//   }

//   // Get Items from Cart
//   getCart() {
//     const db = getDb();
//     const productsIds = this.cart.items.map((product) => product.productId);
//     console.log("productsIds", productsIds);
//     return db
//       .collection("products")
//       .find({ _id: { $in: productsIds } })
//       .toArray()
//       .then((products) => {
//         // get quantity of every product based on his productId
//         return products.map((p) => {
//           return {
//             ...p,
//             quantity: this.cart.items.find((i) => {
//               return i.productId.toString() === p._id.toString();
//             }).quantity,
//           };
//         });
//       })
//       .catch((err) => {
//         console.log("error getCart user Model", err);
//       });
//   }

//   // Delete items from cart
//   deleteItemFromCart(productId) {
//     const db = getDb();
//     const updatedCartItems = this.cart.items.filter(
//       (product) => product.productId.toString() !== productId.toString()
//     );

//     console.log("updatedCartItems", updatedCartItems);

//     return db
//       .collection("users")
//       .updateOne(
//         { _id: new mongodb.ObjectId(this._id) },
//         { $set: { cart: { items: updatedCartItems } } }
//       );
//   }

//   addOrder() {
//     const db = getDb();

//     // get the items from cart and build the order obj which cointains :
//     // items : products (all the products from cart)
//     // user : info about the user who placed the order (userid,name,email,etc)

//     return this.getCart() // return an array with all the products from cart
//       .then((products) => {
//         const order = {
//           user: {
//             _id: this._id,
//             email: this.email,
//             username: this.username,
//           },
//           items: products,
//         };
//         console.log("order to insert for userid", this._id, order);
//         return db.collection("orders").insertOne(order);
//       })
//       .then((result) => {
//         console.log("inserted successfully", result);
//         this.cart = { items: [] };

//         return db
//           .collection("users")
//           .updateOne(
//             { _id: new mongodb.ObjectId(this._id) },
//             { $set: { cart: { items: [] } } }
//           );
//       })
//       .then((resultUpdate) => {
//         console.log("updated succesfully", resultUpdate);
//       })
//       .catch((err) => {
//         console.log("@@@ERROR addOrder", err);
//       });
//   }

//   getOrders() {
//     const db = getDb();

//     // get all the orders for specific user
//     return db
//       .collection("orders")
//       .find({ "user._id": new mongodb.ObjectId(this._id) })
//       .toArray();
//   }
// }

// module.exports = User;
