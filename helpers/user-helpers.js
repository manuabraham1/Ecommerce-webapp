const db = require('../config/connection')
const collection = require('../config/collections')
const brcypt = require('bcrypt')
const { response } = require('../app')
const objectId = require('mongodb').ObjectId
const Razorpay=require('razorpay')
const { resolve } = require('path')
var instance = new Razorpay({
    key_id: 'rzp_test_EbWkw0sgHu6CQ1',
    key_secret: 'Lk8JpmkTKnSdV0V1Hl98WNSg'
  });

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await brcypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((userData) => {
                resolve(userData)
            })
        })
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                brcypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log("Login Success")
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('Login Failed')
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('Login Failed')
                resolve({ status: false })
            }
        })
    },

    addToCart: (prodId, userId) => {
        let proObj = {
            item: new objectId(prodId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (userCart) {
                let proExist = userCart.product.findIndex(product => product.item == prodId)
                // console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user:new objectId(userId),'product.item': new objectId(prodId) },
                            {
                                $inc: { 'product.$.quantity': 1 }
                            }
                        ).then((response) => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new objectId(userId) },
                            {
                                $push: { product: proObj }
                            }).then(() => {
                                resolve()
                            })
                }

            } else {
                let cartObj = {
                    user: new objectId(userId),
                    product: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new objectId(userId) }
                },
                {
                    $unwind:'$product'
                },
                {
                    $project:{
                            item:'$product.item',
                            quantity:'$product.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray();
            resolve(cartItems)
        })
    },

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (cart) {
                count = cart.product.length
            }
            resolve(count)
        })
    },

    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:new objectId(details.cart)},
                    {
                        $pull:{product:{item: new objectId(details.product)}}
                    }
                    ).then((response)=>{
                        resolve({removeProduct:true})
                    })
            }else{
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:new objectId(details.cart), 'product.item':new objectId(details.product)}, 
                    {
                        $inc:{'product.$.quantity':details.count}
                    }
                    ).then((response)=>{
                        resolve({status:true})
                    })
            }
        })
    },

    removeProduct:(details)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).
                updateOne({_id:new objectId(details.cart)},
                {
                    $pull: {product:{item: new objectId(details.product)}}
                }).then((response)=>{
                    resolve(true)
                })
        })
    },

    getTotalAmount:(user)=>{
        return new Promise(async(resolve,reject)=>{
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new objectId(user) }
                },
                {
                    $unwind:'$product'
                },
                {
                    $project:{
                            item:'$product.item',
                            quantity:'$product.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity',{$toInt:'$product.price'}]}}
                    }
                }
            ]).toArray();
            console.log(total)
            if(total.length===0)
            {
                resolve()
            }else{
                resolve(total[0].total)
            }
            
        })
    },

    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(userId)
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})
            console.log(cart)
            resolve(cart.product)
        })
    },

    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            console.log(order,products,total)
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: new objectId(order.userId),
                date: new Date(),
                paymentMethod:order['payment-method'],
                products:products,
                totalPrice:total,
                status:status
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:new objectId(order.userId)})
                resolve(response.insertedId.toString())
            })
        })
    },

    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTION)
                .find({userId:new objectId(userId)}).toArray()
            resolve(orders)
        })
    },

    getOrderProducts:(orderId)=>{
        return new Promise(async (resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:new objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            console.log(orderItems)
            resolve(orderItems)
        })
    },

    generateRazorpay:(orderid,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: orderid
              };
              instance.orders.create(options, function(err, order) {
                console.log(order);
                resolve(order)
              });
        })
    },

    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            var crypto = require('crypto');
            let hmac=crypto.createHmac('sha256','Lk8JpmkTKnSdV0V1Hl98WNSg')

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },

    changeOrderStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({_id:new objectId(orderId)},
                {
                    $set:{
                        status:'placed'
                    }
                }).then(()=>{
                    resolve()
                })
        })
    }
}