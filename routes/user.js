var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')
var userHelpers=require('../helpers/user-helpers');
const { use, response } = require('../app');

const verifyLogin=(req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/',async function(req, res, next) {
  
  let user=req.session.user
  let cartCount=null;
  if(user){
    cartCount=await userHelpers.getCartCount(req.session.user._id)
  }
  
  productHelpers.getAllProduct().then((products)=>{
    res.render('user/view-products', { products,admin:false,user,cartCount });
  })
});

router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{
    
    res.render('user/login',{'loginErr':req.session.userLoginErr});
    req.session.userLoginErr=false
  }
  
})

router.post('/login',(req,res)=>{

  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      
      req.session.user=response.user
      req.session.userLoggedIn=true
      res.redirect('/')
    }else{
      req.session.userLoginErr='Invalid username or Password';
      res.redirect('/login',)
    }
  })
})

router.get('/signup',(req,res)=>{
  res.render('user/signup')
})

router.post('/signup',(req,res)=>{
  
  userHelpers.doSignup(req.body).then((response)=>{
    
    req.session.user=response.user
    req.session.userLoggedIn=true
    res.render('user/signup')
  })
})

router.get('/cart',verifyLogin,async (req,res)=>{
  let user=req.session.user
  let products=await userHelpers.getCartProducts(req.session.user._id)
  let total= await userHelpers.getTotalAmount(req.session.user._id)
  if(products.length===0){
    products=null
    total=null
  }
  console.log(user)
  res.render('user/cart',{user,products,total})
})

router.get('/add-to-cart/:id',(req,res)=>{
  console.log('API Called')
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})

router.post('/remove-product',(req,res)=>{
  userHelpers.removeProduct(req.body).then((response)=>{
    res.json({status:true})
  })
})

router.post('/change-product-quantity',(req,res)=>{
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    
    response.total= await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res)=>{
  let user=req.session.user
  let total=await userHelpers.getTotalAmount(user._id)
  res.render('user/place-order',{user,total})
})

router.post('/place-order',async (req,res)=>{
  let products=await userHelpers.getCartProductList(req.body.userId)
  let totalPrice= await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if(req.body['payment-method']=='COD')
    {
      res.json({codSuccess:true})
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)
      })
    }
    
  })
})

router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})

router.get('/orders',verifyLogin,async(req,res)=>{
  let orders=await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})
})

router.get('/view-order-products/:id',verifyLogin,async (req,res)=>{
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})

router.post('/verify-payment',(req,res)=>{
  console.log(req.body)
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changeOrderStatus(req.body['order[receipt]']).then(()=>{
      console.log('Payment Successful')
      res.json({status:true})
    }).catch((err)=>{
      console.log(err)
      res.json({status:false})
    })
  })
})

router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userLoggedIn=false
  res.redirect('/')
})

module.exports = router;
