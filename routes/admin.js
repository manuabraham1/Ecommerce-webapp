var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const { response } = require('../app');
const fs = require('fs')

const verifyLogin = (req, res, next) => {
  if(req.session.admin){
    if (req.session.adminLoggedIn) {
      next()
    }
  }else {
    res.redirect('/admin')
  }
}

/* GET users listing. */
router.get('/view-products',verifyLogin, function (req, res, next) {
  productHelpers.getAllProduct().then((products) => {
    let adminSession=req.session.admin
    res.render('admin/view-products', { admin: true, products,adminSession});
  })

});

router.get('/view-orders',verifyLogin,(req,res)=>{
  productHelpers.getAllOrders().then((orders)=>{
    let adminSession=req.session.admin
    res.render('admin/view-order',{orders,admin:true,adminSession})
  })
  
}),

router.post('/change-order-status',(req,res)=>{

  productHelpers.changeOrderStatus(req.body.order,req.body.status).then((response)=>{
    res.json({status:true})
  })
})

router.get('/view-users',(req,res)=>{
  productHelpers.getAllUsers().then((users)=>{
    let adminSession=req.session.admin
    console.log(users)
    res.render('admin/view-users',{users,admin:true,adminSession})
  })
  
})

router.get('/add-product', verifyLogin, function (req, res) {
  res.render('admin/add-product', { admin: true })
})


router.post('/add-product', verifyLogin,(req, res, next) => {
  console.log(req.body);
  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product', { admin: true })
      } else {
        console.log(err)
      }
    })

  })
})

router.get('/edit-product/:id', verifyLogin,async (req, res) => {

  let product = await productHelpers.getProductDetails(req.params.id)
  console.log(product)
  res.render('admin/edit-product', { product })
})

router.post('/edit-product/:id', verifyLogin,(req, res) => {
  let id = req.params.id
  productHelpers.updateProduct(req.body, req.params.id).then(() => {
    res.redirect('/admin/view-products')
    if (req.files.image) {
      let image = req.files.image
      image.mv('./public/product-images/' + id + '.jpg')
    }
  })
})

router.get('/delete-product/:id', verifyLogin,(req, res) => {
  let proId = req.params.id
  console.log(proId)
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/view-products')
    fs.unlinkSync('./public/product-images/' + req.params.id + '.jpg')
  })
  // res.render('admin/edit-product')
})

router.get('/', (req, res) => {
  if (req.session.admin) {
    res.redirect('/view-products')
  } else {
    console.log('Login Page')
    res.render('admin/admin-login', { 'loginErr': req.session.adminLoginErr, admin: true});
    req.session.adminLoginErr = false
  }

})

router.post('/login', (req, res) => {
  
  if (req.body.Email === 'admin' && req.body.Password === 'admin') {
    req.session.admin=req.body
    req.session.adminLoggedIn = true
    res.redirect('/admin/view-products')
  } else {
    req.session.adminLoginErr = 'Invalid admin';
    res.redirect('/admin',)
  }

})

router.get('/logout',(req,res)=>{
  req.session.admin=null
  req.session.userLoggedIn=false
  res.redirect('/admin')
})

module.exports = router;
