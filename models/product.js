const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  imageURL: {
    type: String,
    required: true,
  },

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Product", productSchema);

// const mongodb = require("mongodb");
// const { getDb } = require("../utils/database");

// class Product {
//   constructor(title, price, imageURL, description, id, userId) {
//     this.title = title;
//     this.price = price;
//     this.imageURL = imageURL;
//     this.description = description;
//     this._id = id;
//     this.userId = userId;
//   }

//   save() {
//     const db = getDb();
//     let dbOp;
//     if (this._id) {
//       console.log("are id => update mode ", this._id);
//       // update the product
//       dbOp = db
//         .collection("products")
//         .updateOne({ _id: new mongodb.ObjectId(this._id) }, { $set: this });
//     } else {
//       console.log("n-are id => insert mode ", this._id);
//       // insert the product
//       dbOp = db.collection("products").insertOne(this);
//     }

//     return dbOp
//       .then((result) => {
//         console.log("result insert", result);
//       })
//       .catch((err) => {
//         console.log("err", err);
//       });
//   }

//   static fetchAll() {
//     const db = getDb();
//     return db
//       .collection("products")
//       .find()
//       .toArray()
//       .then((products) => {
//         console.log("result fetchAll", products);
//         return products;
//       })
//       .catch((err) => {
//         console.log("error fetchAll", err);
//       });
//   }

//   static findById(productId) {
//     const db = getDb();

//     return db
//       .collection("products")
//       .find({ _id: new mongodb.ObjectId(productId) })
//       .next()
//       .then((product) => {
//         console.log("product found for productId", productId, product);
//         return product;
//       })
//       .catch((err) => {
//         console.log("err findById for productId", productId, err);
//       });
//   }

//   static deleteById(productId) {
//     const db = getDb();

//     return db
//       .collection("products")
//       .deleteOne({ _id: new mongodb.ObjectId(productId) })
//       .then((result) => {
//         console.log("result delete method", result);
//       })
//       .catch((err) => {
//         console.log("err delete method", err);
//       });
//   }
// }

// module.exports = Product;
