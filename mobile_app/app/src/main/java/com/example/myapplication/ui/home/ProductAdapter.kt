package com.example.myapplication.ui.home

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.example.myapplication.R
import com.example.myapplication.model.Product

class ProductAdapter(
    private val products: List<Product>,
    private val onAddProduct: (Product) -> Unit
) : RecyclerView.Adapter<ProductAdapter.ProductViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.product_item, parent, false)
        return ProductViewHolder(view, onAddProduct)
    }

    override fun onBindViewHolder(holder: ProductViewHolder, position: Int) {
        holder.bind(products[position])
    }

    override fun getItemCount() = products.size

    class ProductViewHolder(
        itemView: View,
        private val onAddProduct: (Product) -> Unit
    ) : RecyclerView.ViewHolder(itemView) {
        private val productName: TextView = itemView.findViewById(R.id.product_name)
        private val productPrice: TextView = itemView.findViewById(R.id.product_price)
        private val productStatus: TextView = itemView.findViewById(R.id.product_status)
        private val productImage: ImageView = itemView.findViewById(R.id.product_image)
        private val addButton: Button = itemView.findViewById(R.id.button_add)

        fun bind(product: Product) {
            productName.text = product.name
            productPrice.text = product.price
            productStatus.text = product.status

            Glide.with(itemView.context)
                .load(product.imageUrl)
                .into(productImage)

            addButton.setOnClickListener {
                onAddProduct(product)
            }
        }
    }
}