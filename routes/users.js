var express = require("express");
var userHelper = require("../helper/userHelper");
var router = express.Router();

//////////////////AUTH CHECKER//////////////////
const verifySignedIn = (req, res, next) => {
  if (req.session.signedIn) {
    next();
  } else {
    res.redirect("/signin");
  }
};

//////////////////ROOT PAGE ROUTER//////////////////
router.get("/", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllProducts().then((products) => {
    res.render("users/home", { products, user });
  });
});

//////////////////HOME PAGE ROUTER//////////////////
router.get("/home", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllProducts().then((products) => {
    res.render("users/home", { products, user });
  });
});

//////////////////STOCK PAGE ROUTER//////////////////
router.get("/stock", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllProducts().then((products) => {
    res.render("users/stock", { products, user });
  });
});

//////////////////ADD STOCK PAGE ROUTER//////////////////
router.get("/add-stock", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllProducts().then((products) => {
    res.render("users/add-stock", { products, user });
  });
});

//////////////////ADD STOCK FUNCTION//////////////////
router.post("/add-stock", function (req, res) {
  userHelper.addProduct(req.body, (id) => {
    res.redirect("/stock");
  });
});

//////////////////DELETE STOCK FUNCTION//////////////////
router.get("/delete-stock/:id", verifySignedIn, function (req, res) {
  let productId = req.params.id;
  userHelper.deleteProduct(productId).then((response) => {
    res.redirect("/stock");
  });
});

//////////////////BILL PAGE ROUTER//////////////////
router.get("/bill", async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;
  if (user) {
    let userId = req.session.user._id;
    cartCount = await userHelper.getCartCount(userId);
  }
  userHelper.getAllProducts().then((products) => {
    res.render("users/bill", { products, user, cartCount });
  });
});

//////////////////SIGNUP PAGE ROUTER//////////////////
router.get("/signup", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/home");
  } else {
    res.render("users/signup", { layout: "authlayout" });
  }
});

//////////////////SIGNUP PAGE FUNCTION//////////////////
router.post("/signup", function (req, res) {
  userHelper.doSignup(req.body).then((response) => {
    req.session.signedIn = true;
    req.session.user = response;
    res.redirect("/home");
  });
});

//////////////////SIGNIN PAGE ROUTER//////////////////
router.get("/signin", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/home");
  } else {
    res.render("users/signin", {
      layout: "authlayout",
      
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});

//////////////////SIGNIN PAGE FUNCTION//////////////////
router.post("/signin", function (req, res) {
  userHelper.doSignin(req.body).then((response) => {
    if (response.status) {
      req.session.signedIn = true;
      req.session.user = response.user;
      res.redirect("/home");
    } else {
      req.session.signInErr = "Invalid Email/Password";
      res.redirect("/signin");
    }
  });
});

//////////////////SIGNOUT FUNCTION//////////////////
router.get("/signout", function (req, res) {
  req.session.signedIn = false;
  req.session.user = null;
  res.redirect("/");
});

router.get("/cart", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  let cartProducts = await userHelper.getCartProducts(userId);
  let total = null;
  if (cartCount != 0) {
    total = await userHelper.getTotalAmount(userId);
  }
  res.render("users/cart", {
    
    user,
    cartCount,
    cartProducts,
    total,
  });
});

router.get("/add-to-cart/:id", function (req, res) {
  console.log("api call");
  let productId = req.params.id;
  let userId = req.session.user._id;
  userHelper.addToCart(productId, userId).then(() => {
    res.json({ status: true });
  });
});

router.post("/change-product-quantity", function (req, res) {
  console.log(req.body);
  userHelper.changeProductQuantity(req.body).then((response) => {
    res.json(response);
  });
});

router.post("/remove-cart-product", (req, res, next) => {
  userHelper.removeCartProduct(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/place-order", verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  let total = await userHelper.getTotalAmount(userId);
  res.render("users/place-order", { user, cartCount, total });
});

router.post("/place-order", async (req, res) => {
  let user = req.session.user;
  let products = await userHelper.getCartProductList(req.body.userId);
  let totalPrice = await userHelper.getTotalAmount(req.body.userId);
  userHelper
    .placeOrder(req.body, products, totalPrice, user)
    .then((orderId) => {
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelper.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    });
});

router.post("/verify-payment", async (req, res) => {
  console.log(req.body);
  userHelper
    .verifyPayment(req.body)
    .then(() => {
      userHelper.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    })
    .catch((err) => {
      res.json({ status: false, errMsg: "Payment Failed" });
    });
});

router.get("/order-placed", verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  res.render("users/order-placed", { user, cartCount });
});

router.get("/orders", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  let orders = await userHelper.getUserOrder(userId);
  res.render("users/orders", { user, cartCount, orders });
});

router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let user = req.session.user;
    let userId = req.session.user._id;
    let cartCount = await userHelper.getCartCount(userId);
    let orderId = req.params.id;
    const order = await userHelper.getOrderById(orderId);
    let products = await userHelper.getOrderProducts(orderId);
    res.render("users/order-products", {
      layout: "layout2",
      
      user,
      order,
      cartCount,
      products,
    });
  }
);

router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  userHelper.cancelOrder(orderId).then(() => {
    res.redirect("/orders");
  });
});

router.post("/search", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  userHelper.searchProduct(req.body).then((response) => {
    res.render("users/search-result", {
      
      user,
      cartCount,
      response,
    });
  });
});

module.exports = router;
