package com.example.myapplication.ui.cart

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.example.myapplication.model.Product

class CartViewModel : ViewModel() {

    private val _cartItems = MutableLiveData<MutableList<Product>>(mutableListOf())
    val cartItems: LiveData<MutableList<Product>> get() = _cartItems

    fun addProduct(product: Product) {
        val list = _cartItems.value
        list?.add(product)
        _cartItems.value = list
    }
}
