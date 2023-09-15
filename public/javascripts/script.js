const { response } = require("../../app")


function addToCart(prodId){
    $.ajax({
        url:'/add-to-cart/'+prodId,
        method:'get',
        success:(response)=>{
            if(response.status){
                let count=$('#cart-count').html()
                console.log(count)
                count=parseInt(count)+1
                $('#cart-count').html(count)
            }
        }
    })
}

function changeQuantity(cartId,proId,userId,count){
    let quantity=parseInt(document.getElementById(proId).innerHTML)
    $.ajax({
        url:'/change-product-quantity',
        data: {
            user:userId,
            cart: cartId,
            product: proId,
            count: count,
            quantity: quantity
        },
        method: 'post',
        success:(response)=>{
            if(response.removeProduct){
                alert("Product removed from cart")
                location.reload()
            }else{
                document.getElementById(proId).innerHTML=quantity+count
                document.getElementById('total').innerHTML=response.total
            }
        }
    })
}

function removeProduct(prodId,cartId){
    $.ajax({
        url:'/remove-product',
        data:{
            cart:cartId,
            product:prodId
        },
        method: 'post',
        success:(response)=>{
            if(response.status){
                location.reload()
                alert('Product removed from cart')
            }
        }
    })
}

function changeOrderStatus(order,status){
    $.ajax({
        url:'change-order-status',
        data:{
            order,status
        },
        method:'post',
        success:(response)=>{
            if(response.status){
                console.log(status)
                document.getElementById('order-status-'+order).innerText=status;
                let btn=document.getElementById('btn-complete'+order)
                console.log(btn)
                if(status=='placed'){
                    document.getElementById('btn-complete-'+order).style.display='none'
                    document.getElementById('btn-cancel-'+order).style.display='none'
                }else if(status=='shipped'){
                    document.getElementById('btn-shipped-'+order).style.display='none'
                    document.getElementById('btn-cancel-'+order).style.display='none'
                }else if(status=='cancel'){
                    document.getElementById('btn-shipped-'+order).style.display='none'
                    document.getElementById('btn-complete-'+order).style.display='none'
                    document.getElementById('btn-cancel-'+order).style.display='none'
                }else if(status=='complete'){
                    document.getElementById('btn-shipped-'+order).style.display='none'
                    document.getElementById('btn-complete-'+order).style.display='none'
                    document.getElementById('btn-cancel-'+order).style.display='none'
                }
                alert('Order Status Changed to '+status)
            }
        }
    })
}