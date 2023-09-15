const db=require('../config/connection')
const collection=require('../config/collections');
const { response } = require('../app');
const objectId=require('mongodb').ObjectId
 
module.exports = {
    addProduct: function(product, callback) {
        db.get().collection('product').insertOne(product).then((data)=>{
            console.log(data.insertedId.toString())
            callback(data.insertedId.toString())
        })
    },

    getAllProduct:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    deleteProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:new objectId(prodId)}).then((response)=>{
                resolve(response)
            })
        } )
    },

    getProductDetails:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:new objectId(prodId)}).then((product)=>{
                resolve(product)
            })
        })
    },

    updateProduct:(product,proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:new objectId(proId)},{
                $set:{
                    name:product.name,
                    category:product.category,
                    price:product.price,
                    description:product.description
                }
            }).then((response)=>{
                resolve()
            })
        })
    },

    getAllOrders:()=>{
        return new Promise((resolve,reject)=>{
            let orders=db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $lookup:{
                        from:collection.USER_COLLECTION,
                        localField:'userId',
                        foreignField:'_id',
                        as:'userInfo'
                    }
                },
                {
                    $project:{
                        date:1,deliveryDetails:1,paymentMethod:1,totalPrice:1,status:1,userInfo:{$arrayElemAt:['$userInfo',0]}
                    }
                }
                
            ]).toArray()
            resolve(orders)
        })
    },

    changeOrderStatus:(order,status)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({_id:new objectId(order)},
                {
                    $set:{
                        status:status
                    }
                }).then((response)=>{
                    resolve()
                })
        })
    },

    getAllUsers:()=>{
        return new Promise(async(resolve,reject)=>{
            let users=await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    }
};