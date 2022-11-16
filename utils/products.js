const calculateProductsSum = (products) => {
  let prods;
  if (!Array.isArray(products)) {
    prods = [...products];
  } else {
    prods = products;
  }

  let sum = 0;
  prods.reduce((_, p) => {
    return (sum += p.productId.price * p.quantity);
  }, 0);

  console.log("SUM IS", sum);
  return sum;
};

module.exports = { calculateProductsSum };
